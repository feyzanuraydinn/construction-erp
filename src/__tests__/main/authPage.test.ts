// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { renderAuthPage } from '../../main/authPage';

const base = {
  lang: 'tr',
  brand: 'Construction ERP · Google Drive',
  pageTitle: 'Bağlantı başarılı',
  title: 'Google Drive bağlandı',
  message: 'Yedekleriniz kaydedilecek.',
};

describe('Google sign-in result page', () => {
  it('renders a self-contained success page', () => {
    const html = renderAuthPage({
      ...base,
      variant: 'success',
      hint: 'Bu sekmeyi kapatabilirsiniz.',
    });
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain('<html lang="tr">');
    expect(html).toContain('<body class="success">');
    expect(html).toContain('<h1>Google Drive bağlandı</h1>');
    expect(html).toContain('<p class="hint">Bu sekmeyi kapatabilirsiniz.</p>');
    expect(html).not.toMatch(/<link|<script|src=|https?:\/\//);
  });

  it('escapes every text it is given and leaves the hint out when there is none', () => {
    const html = renderAuthPage({
      ...base,
      variant: 'error',
      message: '<img src=x onerror=alert(1)>',
      title: 'a & b',
    });
    expect(html).toContain('<body class="error">');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('<h1>a &amp; b</h1>');
    expect(html).not.toContain('class="hint"');
  });
});
