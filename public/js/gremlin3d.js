/**
 * 3D Gremlin Head Model rendered using Three.js.
 * Provides articulated jaw (mouth open/close), blinking eyelids,
 * pointed ears, and responsive Euler head rotations (pitch, yaw, roll).
 */
class GremlinHead3D {
  constructor(options = {}) {
    this.canvas = options.canvas;
    this.width = options.width || 1024;
    this.height = options.height || 576;
    this.isOverlay = options.isOverlay !== undefined ? options.isOverlay : true;

    // Smoothed pose values
    this.pose = {
      yaw: 0,
      pitch: 0,
      roll: 0,
      mouthOpen: 0,
      leftEye: 1,
      rightEye: 1,
      x: this.width / 2,
      y: this.height / 2
    };

    this.targetPose = { ...this.pose };
    this.idleTime = 0;

    this.initThree();
    this.buildGremlinModel();
  }

  initThree() {
    this.scene = new THREE.Scene();

    if (this.isOverlay) {
      // Orthographic camera mapping directly to screen pixels (0,0 at top-left)
      this.camera = new THREE.OrthographicCamera(
        0,
        this.width,
        0,
        this.height,
        -1500,
        1500
      );
      this.camera.position.z = 500;
    } else {
      // Perspective camera centered on head for avatar preview
      this.camera = new THREE.PerspectiveCamera(
        45,
        this.width / this.height,
        0.1,
        1000
      );
      this.camera.position.set(0, 5, 140);
      this.camera.lookAt(0, 0, 0);
    }

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5ea, 0.9);
    keyLight.position.set(50, 100, 100);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x48bb78, 0.6);
    rimLight.position.set(-80, -50, -60);
    this.scene.add(rimLight);
  }

  buildGremlinModel() {
    this.rootGroup = new THREE.Group();
    this.headGroup = new THREE.Group();
    this.rootGroup.add(this.headGroup);
    this.scene.add(this.rootGroup);

    // Scaling based on mode
    const baseScale = this.isOverlay ? 38 : 34;
    this.rootGroup.scale.set(baseScale, baseScale, baseScale);

    if (this.isOverlay) {
      this.rootGroup.position.set(this.pose.x, this.pose.y, 0);
    } else {
      this.rootGroup.position.set(0, 0, 0);
    }

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x38a169, // Gremlin green
      roughness: 0.35,
      metalness: 0.1
    });

    const innerEarMat = new THREE.MeshStandardMaterial({
      color: 0xe53e3e, // Deep pink/red inside ears
      roughness: 0.5
    });

    const eyeWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xfffff0,
      roughness: 0.2
    });

    const pupilMat = new THREE.MeshStandardMaterial({
      color: 0x1a202c,
      roughness: 0.1
    });

    const toothMat = new THREE.MeshStandardMaterial({
      color: 0xf7fafc,
      roughness: 0.3
    });

    const mouthInsideMat = new THREE.MeshBasicMaterial({
      color: 0x2d0c14
    });

    // 1. Cranium (Upper Head)
    const craniumGeo = new THREE.SphereGeometry(1.0, 24, 24);
    // Squash slightly for goblin skull shape
    craniumGeo.scale(1.05, 0.95, 1.0);
    const cranium = new THREE.Mesh(craniumGeo, skinMat);
    cranium.position.set(0, 0.2, 0);
    this.headGroup.add(cranium);

    // Brow ridge
    const browGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.25, 16);
    const brow = new THREE.Mesh(browGeo, skinMat);
    brow.rotation.z = Math.PI / 2;
    brow.position.set(0, 0.45, 0.65);
    brow.scale.set(0.4, 1.0, 0.3);
    this.headGroup.add(brow);

    // Small horns / ear tufts on top
    [-0.5, 0.5].forEach((xSide) => {
      const hornGeo = new THREE.ConeGeometry(0.18, 0.6, 12);
      const horn = new THREE.Mesh(hornGeo, skinMat);
      horn.position.set(xSide, 1.15, -0.1);
      horn.rotation.z = xSide > 0 ? -0.35 : 0.35;
      horn.rotation.x = -0.2;
      this.headGroup.add(horn);
    });

    // 2. Large Pointed Gremlin Ears
    this.ears = [];
    [-1, 1].forEach((dir) => {
      const earGroup = new THREE.Group();
      earGroup.position.set(dir * 0.95, 0.2, -0.1);

      // Outer ear cone
      const earGeo = new THREE.ConeGeometry(0.4, 1.6, 16);
      earGeo.scale(0.3, 1, 1);
      const earMesh = new THREE.Mesh(earGeo, skinMat);
      earMesh.rotation.z = dir * (Math.PI / 2.5);
      earMesh.rotation.x = 0.2;
      earMesh.position.set(dir * 0.7, 0.1, 0);
      earGroup.add(earMesh);

      // Inner ear pink inset
      const innerEarGeo = new THREE.ConeGeometry(0.24, 1.2, 12);
      innerEarGeo.scale(0.2, 1, 0.8);
      const innerEarMesh = new THREE.Mesh(innerEarGeo, innerEarMat);
      innerEarMesh.rotation.z = dir * (Math.PI / 2.5);
      innerEarMesh.rotation.x = 0.2;
      innerEarMesh.position.set(dir * 0.68, 0.1, 0.06);
      earGroup.add(innerEarMesh);

      this.headGroup.add(earGroup);
      this.ears.push(earGroup);
    });

    // 3. Eyes & Eyelids
    this.eyes = [];
    this.eyelids = [];
    [-0.42, 0.42].forEach((xPos, idx) => {
      const eyePivot = new THREE.Group();
      eyePivot.position.set(xPos, 0.22, 0.82);

      // Eyeball
      const eyeballGeo = new THREE.SphereGeometry(0.28, 16, 16);
      const eyeball = new THREE.Mesh(eyeballGeo, eyeWhiteMat);
      eyePivot.add(eyeball);

      // Iris / Pupil
      const pupilGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(0, 0, 0.22);
      eyePivot.add(pupil);

      // Eyelid (blinking hemisphere shell)
      const eyelidGeo = new THREE.SphereGeometry(0.30, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const eyelid = new THREE.Mesh(eyelidGeo, skinMat);
      eyelid.rotation.x = -Math.PI / 2; // Start retracted (eye open)
      eyePivot.add(eyelid);

      this.headGroup.add(eyePivot);
      this.eyes.push(eyePivot);
      this.eyelids.push(eyelid);
    });

    // 4. Upper Jaw & Teeth
    const upperMouthCavityGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16, 1, false, 0, Math.PI);
    const upperMouth = new THREE.Mesh(upperMouthCavityGeo, mouthInsideMat);
    upperMouth.position.set(0, -0.2, 0.6);
    upperMouth.rotation.x = Math.PI / 2;
    this.headGroup.add(upperMouth);

    // Upper fangs
    [-0.22, 0.22].forEach((xPos) => {
      const fangGeo = new THREE.ConeGeometry(0.08, 0.22, 8);
      const fang = new THREE.Mesh(fangGeo, toothMat);
      fang.position.set(xPos, -0.2, 0.88);
      fang.rotation.x = Math.PI;
      this.headGroup.add(fang);
    });

    // 5. Articulated Lower Jaw (Mouth Opening)
    this.jawGroup = new THREE.Group();
    this.jawGroup.position.set(0, -0.2, 0.2); // Jaw hinge pivot point

    const chinGeo = new THREE.SphereGeometry(0.55, 16, 16);
    chinGeo.scale(0.9, 0.5, 1.0);
    const chin = new THREE.Mesh(chinGeo, skinMat);
    chin.position.set(0, -0.15, 0.45);
    this.jawGroup.add(chin);

    // Lower teeth
    [-0.18, 0, 0.18].forEach((xPos) => {
      const toothGeo = new THREE.ConeGeometry(0.06, 0.18, 8);
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      tooth.position.set(xPos, -0.02, 0.82);
      this.jawGroup.add(tooth);
    });

    this.headGroup.add(this.jawGroup);
  }

  /**
   * Update the target head pose from face tracking or controls
   * @param {Object} pose { yaw, pitch, roll, mouthOpen, leftEye, rightEye, x, y }
   */
  updatePose(pose) {
    if (!pose) return;
    if (pose.yaw !== undefined) this.targetPose.yaw = pose.yaw;
    if (pose.pitch !== undefined) this.targetPose.pitch = pose.pitch;
    if (pose.roll !== undefined) this.targetPose.roll = pose.roll;
    if (pose.mouthOpen !== undefined) this.targetPose.mouthOpen = pose.mouthOpen;
    if (pose.leftEye !== undefined) this.targetPose.leftEye = pose.leftEye;
    if (pose.rightEye !== undefined) this.targetPose.rightEye = pose.rightEye;
    if (pose.x !== undefined) this.targetPose.x = pose.x;
    if (pose.y !== undefined) this.targetPose.y = pose.y;
  }

  setPosition(x, y) {
    this.targetPose.x = x;
    this.targetPose.y = y;
  }

  /**
   * Render frame with smooth interpolation (lerp)
   */
  render() {
    this.idleTime += 0.03;

    // Linear interpolation for smooth non-jittery movement
    const lerpRate = 0.22;
    this.pose.yaw += (this.targetPose.yaw - this.pose.yaw) * lerpRate;
    this.pose.pitch += (this.targetPose.pitch - this.pose.pitch) * lerpRate;
    this.pose.roll += (this.targetPose.roll - this.pose.roll) * lerpRate;
    this.pose.mouthOpen += (this.targetPose.mouthOpen - this.pose.mouthOpen) * 0.35;
    this.pose.leftEye += (this.targetPose.leftEye - this.pose.leftEye) * 0.4;
    this.pose.rightEye += (this.targetPose.rightEye - this.pose.rightEye) * 0.4;

    this.pose.x += (this.targetPose.x - this.pose.x) * 0.2;
    this.pose.y += (this.targetPose.y - this.pose.y) * 0.2;

    // Idle subtle breathing / floating
    const floatOffset = Math.sin(this.idleTime) * 3;

    if (this.isOverlay) {
      this.rootGroup.position.set(this.pose.x, this.pose.y + floatOffset, 0);
    } else {
      this.rootGroup.position.set(0, floatOffset * 0.2, 0);
    }

    // Apply head orientation
    // Note: In overlay orthographic mode, canvas Y is inverted compared to standard 3D Y
    const pitchMultiplier = this.isOverlay ? 1.0 : -1.0;
    this.headGroup.rotation.y = this.pose.yaw;
    this.headGroup.rotation.x = this.pose.pitch * pitchMultiplier;
    this.headGroup.rotation.z = -this.pose.roll;

    // Articulate lower jaw based on mouthOpen (0 to 1)
    const clampedMouth = Math.max(0, Math.min(1, this.pose.mouthOpen));
    this.jawGroup.rotation.x = clampedMouth * (Math.PI / 4.5);

    // Blinking eyelids (1 = open, 0 = closed)
    // -Math.PI/2 is open, 0 is fully closed
    const leftBlink = Math.max(0, Math.min(1, this.pose.leftEye));
    const rightBlink = Math.max(0, Math.min(1, this.pose.rightEye));

    if (this.eyelids[0]) {
      this.eyelids[0].rotation.x = -Math.PI / 2 + (1 - leftBlink) * (Math.PI / 2);
    }
    if (this.eyelids[1]) {
      this.eyelids[1].rotation.x = -Math.PI / 2 + (1 - rightBlink) * (Math.PI / 2);
    }

    // Ear wiggles on head roll
    if (this.ears[0] && this.ears[1]) {
      this.ears[0].rotation.z = this.pose.roll * 0.3;
      this.ears[1].rotation.z = this.pose.roll * 0.3;
    }

    this.renderer.render(this.scene, this.camera);
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height);
    if (this.isOverlay) {
      this.camera.right = width;
      this.camera.bottom = height;
    } else {
      this.camera.aspect = width / height;
    }
    this.camera.updateProjectionMatrix();
  }
}

// Export to window
window.GremlinHead3D = GremlinHead3D;

