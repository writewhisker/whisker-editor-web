// vite.config.ts
import { defineConfig } from "file:///Users/jims/code/github.com/writewhisker/whisker-editor-web/node_modules/.pnpm/vite@6.4.1_@types+node@22.19.1_jiti@2.6.1_lightningcss@1.30.2/node_modules/vite/dist/node/index.js";
import { resolve } from "path";
var __vite_injected_original_dirname = "/Users/jims/code/github.com/writewhisker/whisker-editor-web/packages/electron-preload";
var vite_config_default = defineConfig({
  build: {
    lib: {
      entry: resolve(__vite_injected_original_dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index"
    },
    rollupOptions: {
      external: ["electron", "@writewhisker/story-models"],
      output: {
        preserveModules: true,
        preserveModulesRoot: "src"
      }
    },
    outDir: "dist",
    emptyOutDir: true
  },
  test: {
    globals: true,
    environment: "node"
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvamltcy9jb2RlL2dpdGh1Yi5jb20vd3JpdGV3aGlza2VyL3doaXNrZXItZWRpdG9yLXdlYi9wYWNrYWdlcy9lbGVjdHJvbi1wcmVsb2FkXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvamltcy9jb2RlL2dpdGh1Yi5jb20vd3JpdGV3aGlza2VyL3doaXNrZXItZWRpdG9yLXdlYi9wYWNrYWdlcy9lbGVjdHJvbi1wcmVsb2FkL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9qaW1zL2NvZGUvZ2l0aHViLmNvbS93cml0ZXdoaXNrZXIvd2hpc2tlci1lZGl0b3Itd2ViL3BhY2thZ2VzL2VsZWN0cm9uLXByZWxvYWQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgYnVpbGQ6IHtcbiAgICBsaWI6IHtcbiAgICAgIGVudHJ5OiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9pbmRleC50cycpLFxuICAgICAgZm9ybWF0czogWydlcyddLFxuICAgICAgZmlsZU5hbWU6ICdpbmRleCcsXG4gICAgfSxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBleHRlcm5hbDogWydlbGVjdHJvbicsICdAd3JpdGV3aGlza2VyL3N0b3J5LW1vZGVscyddLFxuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIHByZXNlcnZlTW9kdWxlczogdHJ1ZSxcbiAgICAgICAgcHJlc2VydmVNb2R1bGVzUm9vdDogJ3NyYycsXG4gICAgICB9LFxuICAgIH0sXG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgZW1wdHlPdXREaXI6IHRydWUsXG4gIH0sXG4gIHRlc3Q6IHtcbiAgICBnbG9iYWxzOiB0cnVlLFxuICAgIGVudmlyb25tZW50OiAnbm9kZScsXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBaWIsU0FBUyxvQkFBb0I7QUFDOWMsU0FBUyxlQUFlO0FBRHhCLElBQU0sbUNBQW1DO0FBR3pDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE9BQU87QUFBQSxJQUNMLEtBQUs7QUFBQSxNQUNILE9BQU8sUUFBUSxrQ0FBVyxjQUFjO0FBQUEsTUFDeEMsU0FBUyxDQUFDLElBQUk7QUFBQSxNQUNkLFVBQVU7QUFBQSxJQUNaO0FBQUEsSUFDQSxlQUFlO0FBQUEsTUFDYixVQUFVLENBQUMsWUFBWSw0QkFBNEI7QUFBQSxNQUNuRCxRQUFRO0FBQUEsUUFDTixpQkFBaUI7QUFBQSxRQUNqQixxQkFBcUI7QUFBQSxNQUN2QjtBQUFBLElBQ0Y7QUFBQSxJQUNBLFFBQVE7QUFBQSxJQUNSLGFBQWE7QUFBQSxFQUNmO0FBQUEsRUFDQSxNQUFNO0FBQUEsSUFDSixTQUFTO0FBQUEsSUFDVCxhQUFhO0FBQUEsRUFDZjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
