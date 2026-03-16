import { createRoot } from 'react-dom/client'
import './pixel.css'
import App from './App.jsx'

// 未使用 StrictMode：KAPLAY 等游戏引擎在开发模式下会被 React 双重挂载，
// 导致 "KAPLAY already initialized" 警告。生产环境不受影响。
createRoot(document.getElementById('root')).render(<App />)
