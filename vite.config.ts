import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

import path from 'path'

function preserveUseDirectives(): Plugin {
  const directiveFiles = new Map<string, string>()

  return {
    name: 'preserve-use-directives',
    transform(code, id) {
      const trimmed = code.trimStart()
      const match = trimmed.match(/^(['"]use (?:client|server)['"]);?/)
      
      if (match) {
        directiveFiles.set(id, match[1].replace(/['"]/g, ''))
      }
      return null
    },
    renderChunk(code, chunk) {
      const directive = Object
        .keys(chunk.modules)
        .reduce<string | undefined>(
          (found, id) => found ?? directiveFiles.get(id),
          undefined
      )
      
      if (directive) {
        return {
          code: `"${directive}";\n${code}`,
          map: null
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), preserveUseDirectives()],
  build: {
    lib: {
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        client: path.resolve(__dirname, 'src/client.ts'),
        server: path.resolve(__dirname, 'src/server.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format}.js`
    },
    rollupOptions: {
      external: [
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom',
        'node:async_hooks',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        },
        manualChunks(id) {
          if (id.endsWith("/provider.client.tsx")) {
            return "provider-client"
          }
          if (id.endsWith("/utils.ts")) {
            return "utils"
          }
        },
      }
    }
  }
})