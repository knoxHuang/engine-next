// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.  
 
#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D state;
uniform vec2 statesize;
uniform float dt;
uniform float mode;
uniform vec2 gravity;
uniform float sizeScale;
uniform float accelScale;
uniform float radiusScale;

varying vec2 index;

const float BASE = 255.0;
const float OFFSET = BASE * BASE / 2.0;
const float MAX_VALUE = BASE * BASE;
const float LIFE_SCALE = 100.0;
const float POSITION_SCALE = 1.0;
const float ROTATION_SCALE = 1.0;
const float COLOR_SCALE = 1.0;

float decode(vec2 channels, float scale) {
    return (dot(channels, vec2(BASE, BASE * BASE)) - OFFSET) / scale;
}

vec2 encode(float value, float scale) {
    value = value * scale + OFFSET;
    float x = mod(value, BASE);
    float y = floor(value / BASE);
    return vec2(x, y) / BASE;
}

vec4 updateLife (vec4 data) {
    float rest = decode(data.rg, LIFE_SCALE);
    rest -= dt;
    return vec4(encode(rest, LIFE_SCALE), data.ba);
}

vec4 updateColor (vec4 color, vec4 deltaRG, vec4 deltaBA, float life) {
    float r = decode(deltaRG.rg, COLOR_SCALE);
    float g = decode(deltaRG.ba, COLOR_SCALE);
    float b = decode(deltaBA.rg, COLOR_SCALE);
    float a = decode(deltaBA.ba, COLOR_SCALE);
    vec4 deltaColor = vec4(r, g, b, a) / 255.0;
    
    color = clamp(color + deltaColor * dt / life, 0.0, 1.0);
    return color;
}

vec4 updateSize (vec4 data, float life) {
    float size = decode(data.rg, sizeScale);
    float deltaSize = decode(data.ba, sizeScale);
    size = clamp(size + deltaSize * dt / life, 0.0, MAX_VALUE);
    return vec4(encode(size, sizeScale), data.ba);
}

vec4 updateRotation (vec4 data, float life) {
    float rotation = decode(data.rg, ROTATION_SCALE);
    float deltaRotation = decode(data.ba, ROTATION_SCALE);
    rotation = mod(rotation + deltaRotation * dt / life, 180.0);
    return vec4(encode(rotation, ROTATION_SCALE), data.ba);
}

vec4 updateControl (vec4 control1, vec4 control2, vec4 posData, float life) {
    /* Mode A: gravity, direction (control1), tangential accel & radial accel (control2) */
    if (mode == 0.0) {
        vec2 dir = vec2(decode(control1.rg, POSITION_SCALE), decode(control1.ba, POSITION_SCALE));
        float radialAccel = decode(control2.rg, accelScale);
        float tangentialAccel = decode(control2.ba, accelScale);

        vec2 pos = vec2(decode(posData.rg, POSITION_SCALE), decode(posData.ba, POSITION_SCALE));
        vec2 radial = normalize(pos);
        vec2 tangential = vec2(-radial.y, radial.x);
        radial = radial * radialAccel;
        tangential = tangential * tangentialAccel;
        vec2 result = dir + (radial + tangentialAccel + gravity) * dt;
        return vec4(encode(result.x, POSITION_SCALE), encode(result.y, POSITION_SCALE));
    }
    /* Mode B: angle & radius (control1), degreesPerSecond & deltaRadius (control2) */
    else {
        float angle = mod(decode(control1.rg, ROTATION_SCALE), 180.0);
        float radius = decode(control1.ba, radiusScale);
        float degreesPerSecond = decode(control2.rg, ROTATION_SCALE);
        float deltaRadius = decode(control2.ba, radiusScale);

        angle += degreesPerSecond * dt;
        radius += deltaRadius * dt / life;
        return vec4(encode(angle, ROTATION_SCALE), encode(radius, radiusScale));
    }
}

vec4 updatePos (vec4 posData, vec4 control) {
    vec2 result;
    /* Mode A */
    if (mode == 0.0) {
        vec2 dir = vec2(decode(control.rg, POSITION_SCALE), decode(control.ba, POSITION_SCALE));
        vec2 pos = vec2(decode(posData.rg, POSITION_SCALE), decode(posData.ba, POSITION_SCALE));
        result = pos + dir * dt;
    }
    /* Mode B */
    else {
        float angle = radians(mod(decode(control.rg, ROTATION_SCALE), 180.0));
        float radius = decode(control.ba, radiusScale);
        result.x = -cos(angle) * radius;
        result.y = -sin(angle) * radius;
    }
    return vec4(encode(result.x, POSITION_SCALE), encode(result.y, POSITION_SCALE));
}

void main() {
    vec2 pixel = floor(index * statesize);
    vec2 pindex = floor(pixel / 3.0);
    vec2 temp = mod(pixel, vec2(3.0));
    float id = floor(temp.y * 3.0 + temp.x);

    /* skip dead particles */
    vec4 data = texture2D(state, index);
    vec4 lifeData = texture2D(state, pindex * 3.0 / statesize);
    float rest = decode(lifeData.rg, LIFE_SCALE);
    if (rest <= 0.0) {
        gl_FragColor = data;
        return;
    }

    /* no need to update helper data */
    if (id == 2.0 || id == 3.0 || id == 7.0) {
        gl_FragColor = data;
        return;
    }

    float life = decode(lifeData.ba, LIFE_SCALE);
    /* Rest life and total life */
    if (id == 0.0) {
        gl_FragColor = updateLife(data);
        return;
    }
    /* Color */
    if (id == 1.0) {
        vec2 rgIndex = vec2(pixel.x + 1.0, pixel.y) / statesize;
        vec4 deltaRG = texture2D(state, rgIndex);
        vec2 baIndex = vec2(pixel.x - 1.0, pixel.y + 1.0) / statesize;
        vec4 deltaBA = texture2D(state, baIndex);
        gl_FragColor = updateColor(data, deltaRG, deltaBA, life);
        return;
    }
    /* Size and delta size */
    if (id == 4.0) {
        gl_FragColor = updateSize(data, life);
        return;
    }
    /* Rotation and delta rotation */
    if (id == 5.0) {
        gl_FragColor = updateRotation(data, life);
        return;
    }
    /* Control */
    if (id == 6.0) {
        vec2 ctrlIndex = vec2(pixel.x + 1.0, pixel.y) / statesize;
        vec4 control2 = texture2D(state, ctrlIndex);
        vec2 posIndex = vec2(pixel.x + 2.0, pixel.y) / statesize;
        vec4 pos = texture2D(state, posIndex);
        gl_FragColor = updateControl(data, control2, pos, life);
        return;
    }
    /* Position */
    if (id == 8.0) {
        vec2 ctrlIndex = vec2(pixel.x - 2.0, pixel.y) / statesize;
        vec4 control1 = texture2D(state, ctrlIndex);
        gl_FragColor = updatePos(data, control1);
        return;
    }
}
