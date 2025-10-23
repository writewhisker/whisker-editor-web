import { mount } from 'svelte'
import './app.css'
import AppWrapper from './AppWrapper.svelte'

const app = mount(AppWrapper, {
  target: document.getElementById('app')!,
})

export default app
