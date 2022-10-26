const edgesVertexShader = `
    #include <morphtarget_pars_vertex>
    #include <skinning_pars_vertex>

    varying vec2 vUv;
    varying vec4 projTexCoord;
    varying vec4 vPosition;
    uniform mat4 textureMatrix;


    void main() {
        #include <skinbase_vertex>
        #include <begin_vertex>
        #include <morphtarget_vertex>
        #include <skinning_vertex>
        #include <project_vertex>

        vPosition = mvPosition;
        vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
        projTexCoord = textureMatrix * worldPosition;
    }
`
export { edgesVertexShader }
