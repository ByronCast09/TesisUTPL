// vite.config.js
import { defineConfig } from "file:///C:/Users/Usuario%20iTC/Desktop/TesisUTPL/tesis_utpl/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Usuario%20iTC/Desktop/TesisUTPL/tesis_utpl/node_modules/@vitejs/plugin-react/dist/index.mjs";
import path from "path";
import tagger from "file:///C:/Users/Usuario%20iTC/Desktop/TesisUTPL/tesis_utpl/node_modules/@dhiwise/component-tagger/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [react(), tagger()],
  build: {
    outDir: "build"
  },
  resolve: {
    alias: {
      "@": path.resolve("./src"),
      "@components": path.resolve("./src/components"),
      "@pages": path.resolve("./src/pages"),
      "@assets": path.resolve("./src/assets"),
      "@constants": path.resolve("./src/constants"),
      "@styles": path.resolve("./src/styles")
    }
  },
  server: {
    port: "4028",
    host: "0.0.0.0",
    strictPort: true,
    allowedHosts: [".amazonaws.com", ".builtwithrocket.new"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxVc3VhcmlvIGlUQ1xcXFxEZXNrdG9wXFxcXFRlc2lzVVRQTFxcXFx0ZXNpc191dHBsXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxVc3VhcmlvIGlUQ1xcXFxEZXNrdG9wXFxcXFRlc2lzVVRQTFxcXFx0ZXNpc191dHBsXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9Vc3VhcmlvJTIwaVRDL0Rlc2t0b3AvVGVzaXNVVFBML3Rlc2lzX3V0cGwvdml0ZS5jb25maWcuanNcIjsvLyB2aXRlLmNvbmZpZy5qc1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgdGFnZ2VyIGZyb20gXCJAZGhpd2lzZS9jb21wb25lbnQtdGFnZ2VyXCI7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAndXJsJztcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpLHRhZ2dlcigpXSxcbiAgYnVpbGQ6IHtcbiAgICBvdXREaXI6IFwiYnVpbGRcIixcbiAgfSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IHBhdGgucmVzb2x2ZSgnLi9zcmMnKSxcbiAgICAgICdAY29tcG9uZW50cyc6IHBhdGgucmVzb2x2ZSgnLi9zcmMvY29tcG9uZW50cycpLFxuICAgICAgJ0BwYWdlcyc6IHBhdGgucmVzb2x2ZSgnLi9zcmMvcGFnZXMnKSxcbiAgICAgICdAYXNzZXRzJzogcGF0aC5yZXNvbHZlKCcuL3NyYy9hc3NldHMnKSxcbiAgICAgICdAY29uc3RhbnRzJzogcGF0aC5yZXNvbHZlKCcuL3NyYy9jb25zdGFudHMnKSxcbiAgICAgICdAc3R5bGVzJzogcGF0aC5yZXNvbHZlKCcuL3NyYy9zdHlsZXMnKSxcbiAgICB9LFxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiBcIjQwMjhcIixcbiAgICBob3N0OiBcIjAuMC4wLjBcIixcbiAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICAgIGFsbG93ZWRIb3N0czogWycuYW1hem9uYXdzLmNvbScsICcuYnVpbHR3aXRocm9ja2V0Lm5ldyddXG4gIH1cbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUNBLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsT0FBTyxZQUFZO0FBSW5CLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLEdBQUUsT0FBTyxDQUFDO0FBQUEsRUFDMUIsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLEVBQ1Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLE9BQU87QUFBQSxNQUN6QixlQUFlLEtBQUssUUFBUSxrQkFBa0I7QUFBQSxNQUM5QyxVQUFVLEtBQUssUUFBUSxhQUFhO0FBQUEsTUFDcEMsV0FBVyxLQUFLLFFBQVEsY0FBYztBQUFBLE1BQ3RDLGNBQWMsS0FBSyxRQUFRLGlCQUFpQjtBQUFBLE1BQzVDLFdBQVcsS0FBSyxRQUFRLGNBQWM7QUFBQSxJQUN4QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxJQUNaLGNBQWMsQ0FBQyxrQkFBa0Isc0JBQXNCO0FBQUEsRUFDekQ7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
