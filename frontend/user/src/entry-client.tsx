import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start'
import { getRouter } from './router'

const router = getRouter()

const rootElement = document.getElementById('root')

if (rootElement) {
  hydrateRoot(rootElement, <StartClient router={router} />)
}
