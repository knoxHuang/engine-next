// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.  
 
import renderer from 'renderer.js';
import Material from '../assets/material';

export default class GraySpriteMaterial extends Material {
  constructor() {
    super(false);

    var pass = new renderer.Pass('gray_sprite');
    pass.setDepth(false, false);
    pass.setCullMode(gfx.CULL_NONE);
    pass.setBlend(
      gfx.BLEND_FUNC_ADD,
      gfx.BLEND_SRC_ALPHA, gfx.BLEND_ONE_MINUS_SRC_ALPHA,
      gfx.BLEND_FUNC_ADD,
      gfx.BLEND_SRC_ALPHA, gfx.BLEND_ONE_MINUS_SRC_ALPHA
    );

    let mainTech = new renderer.Technique(
      ['transparent'],
      [
        { name: 'texture', type: renderer.PARAM_TEXTURE_2D },
      ],
      [
        pass
      ]
    );

    this._effect = new renderer.Effect(
      [
        mainTech,
      ],
      {},
      []
    );
    
    this._mainTech = mainTech;
    this._texture = null;
  }

  get effect () {
    return this._effect;
  }

  get texture () {
    return this._texture;
  }

  set texture (val) {
    if (this._texture !== val) {
      this._texture = val;
      this._effect.setProperty('texture', val.getImpl());
      this._texIds['texture'] = val.getId();
    }
  }

  clone () {
    let copy = new GraySpriteMaterial(values);
    copy.texture = this.texture;
    copy.updateHash();
    return copy;
  }
}