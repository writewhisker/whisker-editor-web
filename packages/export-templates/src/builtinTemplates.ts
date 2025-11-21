import type { Template } from './Template';

export const defaultTemplate: Template = {
  name: 'Default',
  description: 'Simple, clean template',
  css: `
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #333; }
    .passage { margin-bottom: 30px; padding: 20px; background: #f9f9f9; border-radius: 8px; }
  `,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>{{ title }}</title>
      <style>{{ css }}</style>
    </head>
    <body>
      <h1>{{ title }}</h1>
      <div class="content">{{ content }}</div>
    </body>
    </html>
  `,
};

export const darkTemplate: Template = {
  name: 'Dark',
  description: 'Dark theme template',
  css: `
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; background: #1a1a1a; color: #e0e0e0; }
    h1 { color: #fff; }
    .passage { margin-bottom: 30px; padding: 20px; background: #2a2a2a; border-radius: 8px; }
  `,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>{{ title }}</title>
      <style>{{ css }}</style>
    </head>
    <body>
      <h1>{{ title }}</h1>
      <div class="content">{{ content }}</div>
    </body>
    </html>
  `,
};

export const builtinTemplates: Template[] = [defaultTemplate, darkTemplate];
