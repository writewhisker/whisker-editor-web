// ../../vitest.config.ts
import { defineConfig } from "file:///Users/jims/code/github.com/writewhisker/whisker-editor-web/node_modules/.pnpm/vitest@3.2.4_@types+node@24.10.0_@vitest+ui@3.2.4_happy-dom@20.0.10_jiti@2.6.1_jsdom@27.1.0_lightningcss@1.30.2/node_modules/vitest/dist/config.js";
import { svelte } from "file:///Users/jims/code/github.com/writewhisker/whisker-editor-web/node_modules/.pnpm/@sveltejs+vite-plugin-svelte@6.2.1_svelte@5.43.4_vite@7.2.1_@types+node@24.10.0_jiti@2.6.1_lightningcss@1.30.2_/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
import path from "path";
var __vite_injected_original_dirname = "/Users/jims/code/github.com/writewhisker/whisker-editor-web";
var vitest_config_default = defineConfig({
  plugins: [
    svelte({
      hot: !process.env.VITEST
    })
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{js,ts}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/lib/**/*.{js,ts,svelte}"],
      exclude: [
        "src/lib/**/*.{test,spec}.{js,ts}",
        "src/lib/components/**/*.svelte"
      ]
    },
    deps: {
      inline: ["monaco-editor", "wasmoon"]
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      "$lib": path.resolve(__vite_injected_original_dirname, "./src/lib"),
      "monaco-editor": path.resolve(__vite_injected_original_dirname, "./src/test/mocks/monaco-editor.ts"),
      "wasmoon": path.resolve(__vite_injected_original_dirname, "./src/test/mocks/wasmoon.ts")
    },
    conditions: ["browser", "default"]
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vdml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9qaW1zL2NvZGUvZ2l0aHViLmNvbS93cml0ZXdoaXNrZXIvd2hpc2tlci1lZGl0b3Itd2ViXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvamltcy9jb2RlL2dpdGh1Yi5jb20vd3JpdGV3aGlza2VyL3doaXNrZXItZWRpdG9yLXdlYi92aXRlc3QuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9qaW1zL2NvZGUvZ2l0aHViLmNvbS93cml0ZXdoaXNrZXIvd2hpc2tlci1lZGl0b3Itd2ViL3ZpdGVzdC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlc3QvY29uZmlnJztcbmltcG9ydCB7IHN2ZWx0ZSB9IGZyb20gJ0BzdmVsdGVqcy92aXRlLXBsdWdpbi1zdmVsdGUnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICBzdmVsdGUoe1xuICAgICAgaG90OiAhcHJvY2Vzcy5lbnYuVklURVNUXG4gICAgfSlcbiAgXSxcbiAgdGVzdDoge1xuICAgIGdsb2JhbHM6IHRydWUsXG4gICAgZW52aXJvbm1lbnQ6ICdqc2RvbScsXG4gICAgc2V0dXBGaWxlczogWycuL3NyYy90ZXN0L3NldHVwLnRzJ10sXG4gICAgaW5jbHVkZTogWydzcmMvKiovKi57dGVzdCxzcGVjfS57anMsdHN9J10sXG4gICAgY292ZXJhZ2U6IHtcbiAgICAgIHByb3ZpZGVyOiAndjgnLFxuICAgICAgcmVwb3J0ZXI6IFsndGV4dCcsICdqc29uJywgJ2h0bWwnXSxcbiAgICAgIGluY2x1ZGU6IFsnc3JjL2xpYi8qKi8qLntqcyx0cyxzdmVsdGV9J10sXG4gICAgICBleGNsdWRlOiBbXG4gICAgICAgICdzcmMvbGliLyoqLyoue3Rlc3Qsc3BlY30ue2pzLHRzfScsXG4gICAgICAgICdzcmMvbGliL2NvbXBvbmVudHMvKiovKi5zdmVsdGUnLFxuICAgICAgXSxcbiAgICB9LFxuICAgIGRlcHM6IHtcbiAgICAgIGlubGluZTogWydtb25hY28tZWRpdG9yJywgJ3dhc21vb24nXSxcbiAgICB9LFxuICB9LFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXG4gICAgICAnJGxpYic6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9saWInKSxcbiAgICAgICdtb25hY28tZWRpdG9yJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3Rlc3QvbW9ja3MvbW9uYWNvLWVkaXRvci50cycpLFxuICAgICAgJ3dhc21vb24nOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvdGVzdC9tb2Nrcy93YXNtb29uLnRzJyksXG4gICAgfSxcbiAgICBjb25kaXRpb25zOiBbJ2Jyb3dzZXInLCAnZGVmYXVsdCddLFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXVXLFNBQVMsb0JBQW9CO0FBQ3BZLFNBQVMsY0FBYztBQUN2QixPQUFPLFVBQVU7QUFGakIsSUFBTSxtQ0FBbUM7QUFJekMsSUFBTyx3QkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxDQUFDLFFBQVEsSUFBSTtBQUFBLElBQ3BCLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFDQSxNQUFNO0FBQUEsSUFDSixTQUFTO0FBQUEsSUFDVCxhQUFhO0FBQUEsSUFDYixZQUFZLENBQUMscUJBQXFCO0FBQUEsSUFDbEMsU0FBUyxDQUFDLDhCQUE4QjtBQUFBLElBQ3hDLFVBQVU7QUFBQSxNQUNSLFVBQVU7QUFBQSxNQUNWLFVBQVUsQ0FBQyxRQUFRLFFBQVEsTUFBTTtBQUFBLE1BQ2pDLFNBQVMsQ0FBQyw2QkFBNkI7QUFBQSxNQUN2QyxTQUFTO0FBQUEsUUFDUDtBQUFBLFFBQ0E7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsTUFBTTtBQUFBLE1BQ0osUUFBUSxDQUFDLGlCQUFpQixTQUFTO0FBQUEsSUFDckM7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsTUFDcEMsUUFBUSxLQUFLLFFBQVEsa0NBQVcsV0FBVztBQUFBLE1BQzNDLGlCQUFpQixLQUFLLFFBQVEsa0NBQVcsbUNBQW1DO0FBQUEsTUFDNUUsV0FBVyxLQUFLLFFBQVEsa0NBQVcsNkJBQTZCO0FBQUEsSUFDbEU7QUFBQSxJQUNBLFlBQVksQ0FBQyxXQUFXLFNBQVM7QUFBQSxFQUNuQztBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
