export interface Template {
  name: string;
  description: string;
  css: string;
  html: string;
  js?: string;
}

export interface TemplateEngine {
  render(template: Template, data: Record<string, any>): string;
  compile(template: string): (data: Record<string, any>) => string;
}

export class SimpleTemplateEngine implements TemplateEngine {
  public render(template: Template, data: Record<string, any>): string {
    let html = template.html;

    // Replace variables
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      html = html.replace(regex, String(value));
    });

    return html;
  }

  public compile(template: string): (data: Record<string, any>) => string {
    return (data: Record<string, any>) => {
      let result = template;
      Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        result = result.replace(regex, String(value));
      });
      return result;
    };
  }
}
