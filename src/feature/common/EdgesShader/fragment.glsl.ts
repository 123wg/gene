const edgesFragmentShader = `
    #include <packing>

    varying vec2 vUv;
    varying vec4 vPosition;
    varying vec4 projTexCoord;
    uniform sampler2D topoTexture;
    uniform sampler2D depthTexture;
    uniform vec2 cameraNearFar;
    uniform vec4 param;

    void main(){
        float depth = unpackRGBAToDepth(texture2DProj (depthTexture, projTexCoord) );
        float viewZ = -orthographicDepthToViewZ(depth, cameraNearFar.x, cameraNearFar.y);
        float d = 1.0;
        vec4 topoColor = texture2D(topoTexture, vUv);
        if(param.x > 0.0){ //透明,完全可见
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }else {
            if(-vPosition.z - viewZ > 0.1) { // 不透明，不可见
                if(param.w > 0.0) {
                    gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
                }else {
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                }
            }else { // 不透明，可见
                gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
            }
        }
    }
`

export { edgesFragmentShader }
