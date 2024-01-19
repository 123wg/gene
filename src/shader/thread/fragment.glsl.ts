export const fragmentShader =  `
    #define SCALE 5.0

    uniform sampler2D threadTextyre;
    uniform vec3 threadCorlor;
    uniform float threadDepth;
    uniform bool reverse;
    uniform bool hasSecondThread;

    varying vec3 vPosition;
    uniform bool isProfile;
    uniform vec3 planeNormal;
    uniform float planeDistance;

    varying vec2 vUv;

    void main() {
        vec4 textureColor = texture(threadTexture,vUv);
        float percent = step(abs(vUv.x), threadDepth /SCALE);
        if (reverse) {
            gl_FragColor = vec4(mix(textureColor.rgb,threadColor,percent),1.0);
        } else {
            gl_FragColor = vec4(mix(threadColor,textureColor.rgb,percent),1.0);
        }
        if(hasSecondThread) {
            percent = step(abs(vUv.x),threadDepth1 / SCALE);
            if (reverse1) {
                gl_FragColor = vec4(mix(textureColor.rgb,gl_FragColor.rgb,percent),1.0);
            } else {
                gl_FragColor = vec4(mix(gl_FragColor.rgb,textureColor.rgb,percent),1.0);
            }
        }
    }

`
