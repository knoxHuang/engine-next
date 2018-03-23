// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.  

import murmurhash2 from './murmurhash2_gc';
import renderer from 'renderer.js';

// function genHashCode (str) {
//     var hash = 0;
//     if (str.length == 0) {
//         return hash;
//     }
//     for (var i = 0; i < str.length; i++) {
//         var char = str.charCodeAt(i);
//         hash = ((hash<<5)-hash)+char;
//         hash = hash & hash; // Convert to 32bit integer
//     }
//     return hash;
// }

function serializeDefines (defines) {
    let str = '';
    for (let i = 0; i < defines.length; i++) {
        str += defines[i].name + defines[i].value;
    }
    return str;
}

function serializePass (pass) {
    let str = pass._programName + pass._cullMode;
    if (pass._blend) {
        str += pass._blendEq + pass._blendAlphaEq + pass._blendSrc + pass._blendDst
             + pass._blendSrcAlpha + pass._blendDstAlpha + pass._blendColor;
    }
    if (pass._depthTest) {
        str += pass._depthWrite + pass._depthFunc;
    }
    if (pass._stencilTest) {
        str += pass._stencilFuncFront + pass._stencilRefFront + pass._stencilMaskFront
             + pass._stencilFailOpFront + pass._stencilZFailOpFront + pass._stencilZPassOpFront
             + pass._stencilWriteMaskFront
             + pass._stencilFuncBack + pass._stencilRefBack + pass._stencilMaskBack
             + pass._stencilFailOpBack + pass._stencilZFailOpBack + pass._stencilZPassOpBack 
             + pass._stencilWriteMaskBack;
    }
    return str;
}

export default function computeHash(material) {
    let effect = material._effect;
    let hashData = '';
    if (effect) {
        let i, j, techData, param, prop, propKey;

        // effect._defines
        hashData += serializeDefines(effect._defines);
        // effect._techniques
        for (i = 0; i < effect._techniques.length; i++) {
            techData = effect._techniques[i];
            // technique.stageIDs
            hashData += techData.stageIDs;
            // technique._layer
            // hashData += + techData._layer + "_";
            // technique.passes
            for (j = 0; j < techData.passes.length; j++) {
                hashData += serializePass(techData.passes[j]);
            }
            //technique._parameters
            for (j = 0; j < techData._parameters.length; j++) {
                param = techData._parameters[j];
                propKey = param.name;
                prop = effect._properties[propKey];
                if (!prop) {
                    continue;
                }
                switch(param.type) {
                    case renderer.PARAM_INT:
                    case renderer.PARAM_FLOAT:
                        hashData += prop + ';';
                        break;
                    case renderer.PARAM_INT2:
                    case renderer.PARAM_FLOAT2:
                        hashData += prop.x + ',' + prop.y + ';';
                        break;
                    case renderer.PARAM_INT4:
                    case renderer.PARAM_FLOAT4:
                        hashData += prop.x + ',' + prop.y + ',' + prop.z + ',' + prop.w + ';';
                        break;
                    case renderer.PARAM_COLOR4:
                        hashData += prop.r + ',' + prop.g + ',' + prop.b + ',' + prop.a + ';';
                        break;
                    case renderer.PARAM_MAT2:
                        hashData += prop.m00 + ',' + prop.m01 + ',' + prop.m02 + ',' + prop.m03 + ';';
                        break;
                    case renderer.PARAM_TEXTURE_2D:
                    case renderer.PARAM_TEXTURE_CUBE:
                        hashData += material._texIds[propKey] + ';';
                        break;
                    case renderer.PARAM_INT3:
                    case renderer.PARAM_FLOAT3:
                    case renderer.PARAM_COLOR3:
                    case renderer.PARAM_MAT3:
                    case renderer.PARAM_MAT4:
                        hashData += JSON.stringify(prop) + ';';
                        break;
                    default:
                        break;
                }
            }
        }
    }
    return hashData ? murmurhash2(hashData, 666) : hashData;
};