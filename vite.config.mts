import { defineConfig } from 'npm:vite@^5.2.10'
import react from 'npm:@vitejs/plugin-react@^4.2.1'

import 'react'
import 'react-dom'
import '@react-three/fiber'
import 'three'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()]
})
