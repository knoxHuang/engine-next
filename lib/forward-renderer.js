// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.  

import { vec3, mat4 } from 'vmath';
import { RecyclePool } from 'memop';

let _a16_view = new Float32Array(16);
let _a16_proj = new Float32Array(16);
let _a16_viewProj = new Float32Array(16);

// Add stage to renderer
renderer.addStage('transparent');

export default class ForwardRenderer extends renderer.Base {
  constructor (device, builtin) {
    super(device, builtin);
    this._registerStage('transparent', this._transparentStage.bind(this));
  }

  reset () {
    this._reset();
  }

  render (scene) {
    this._reset();

    scene._cameras.sort((a, b) => {
      if (a._depth > b._depth) return 1;
      else if (a._depth < b._depth) return -1;
      else return 0;
    });

    for (let i = 0; i < scene._cameras.length; ++i) {
      let camera = scene._cameras.data[i];
      this.renderCamera(camera, scene);
    }
  }

  renderCamera (camera, scene) {
    const canvas = this._device._gl.canvas;

    let view = camera.view;
    let dirty = camera.dirty;
    if (!view) {
      view = this._requestView();
      dirty = true;
    }
    if (dirty) {
      let width = canvas.width;
      let height = canvas.height;
      if (camera._framebuffer) {
        width = camera._framebuffer._width;
        height = camera._framebuffer._height;
      }
      camera.extractView(view, width, height);
    }
    this._render(view, scene);
  }

  _transparentStage (view, items) {
    // update uniforms
    this._device.setUniform('view', mat4.array(_a16_view, view._matView));
    this._device.setUniform('proj', mat4.array(_a16_proj, view._matProj));
    this._device.setUniform('viewProj', mat4.array(_a16_viewProj, view._matViewProj));

    // draw it
    for (let i = 0; i < items.length; ++i) {
      let item = items.data[i];
      this._draw(item);
    }
  }
}