export const outLineFragmentShader = `
    #include <common>
    #include <fog_pars_fragment>
    #include <logdepthbuf_pars_fragment>
    #include <clipping_planes_pars_fragment>

    uniform vec3 outlineColor;
    uniform float outlineAlpha;

    void main() {
        #include <clipping_planes_fragment>
        #include <logdepthbuf_fragment>

        gl_FragColor = vec4(outlineColor, outlineAlpha);

        #include <tonemapping_fragment>
        #include <encodings_fragment>
        #include <fog_fragment>
        #include <premultiplied_alpha_fragment>
    }
`
