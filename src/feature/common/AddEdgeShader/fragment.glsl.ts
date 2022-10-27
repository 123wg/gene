export const addEdgeFragmentShader = `
    varying vec2 vUv;
    uniform vec2 texSize;
    uniform vec4 param;

    uniform sampler2D topoTexture;
    uniform sampler2D tEdgeTexture;

    void sortArr(float[5] a, int k) {
        float temp;
        for( int j = 0; j < k - 1; j++ ){
            for(int i = 0; i < k - 1 - j; i++) {
                if( a[i] < a[ i + 1 ] ){
                    temp = a[ i ];
                    a[ i ] = a[ i + 1 ];
                    a[ i + 1] = temp;
                }
            }
        }
    }

    float accumCal( float[5] a, int k ){
        float f = a[k - 1];
        for(int i = k - 2; i > -1; i--) {
            f = f * (1.0 - a[i]) + a[i];
        }
        return f;
    }

    float getBoldLineColor(sampler2D maskTexture, vec2 texSize) {
        vec4 c = texture2D(maskTexture, vUv);
        if(c.r > 0.99) {
            return c.r;
        }
        vec2 invSize = 1.0 / texSize;
        vec4 uvOffset = vec4(1.0, 0.0, 0.0, 1.0) * vec4(invSize, invSize);
        vec4 c1 = texture2D(maskTexture, vUv + uvOffset.xy);
        vec4 c2 = texture2D(maskTexture, vUv - uvOffset.xy);
        vec4 c3 = texture2D(maskTexture, vUv + uvOffset.yw);
        vec4 c4 = texture2D(maskTexture, vUv - uvOffset.yw);
        float a[5];
        a[0] = c.r;
        a[1] = c1.r * 0.2;
        a[2] = c2.r * 0.2;
        a[3] = c3.r * 0.2;
        a[4] = c4.r * 0.2;
        int k = 5;
        sortArr(a, k);
        return accumCal(a, k);
    }

    float getBoldLineColor2(sampler2D maskTexture, vec2 texSize) {
        vec4 c = texture2D(maskTexture, vUv);
        if(c.g > 0.99) {
            return c.g;
        }
        vec2 invSize = 1.0 / texSize;
        vec4 uvOffset = vec4(1.0, 0.0, 0.0, 1.0) * vec4(invSize, invSize);
        vec4 c1 = texture2D(maskTexture, vUv + uvOffset.xy);
        vec4 c2 = texture2D(maskTexture, vUv - uvOffset.xy);
        vec4 c3 = texture2D(maskTexture, vUv + uvOffset.yw);
        vec4 c4 = texture2D(maskTexture, vUv - uvOffset.yw);
        float a[5];
        a[0] = c.g;
        a[1] = c1.g * 0.2;
        a[2] = c2.g * 0.2;
        a[3] = c3.g * 0.2;
        a[4] = c4.g * 0.2;
        int k = 5;
        sortArr(a, k);
        return accumCal(a, k);
    }

    vec4 addEdge(vec4 finalColor) {
        float f = param.z > 0.0 ? getBoldLineColor(tEdgeTexture, texSize) : 0.0;
        if(f > 0.0) {
            return vec4( finalColor.xyz * ( 1.0 - f * 0.85), 1.0 );
        }else {
            f = param.w > 0.0 ? getBoldLineColor2( tEdgeTexture, texSize) : 0.0;
            if(f > 0.0) {
                return vec4( finalColor.xyz * (1.0 - f) + vec3(0.87451, 0.87451, 0.87451) * f, 1.0 );
            }
        }
        return finalColor;
    }

    void main(){
        vec4 finalColor = texture2D(topoTexture, vUv);
        gl_FragColor = finalColor;
    }
`
