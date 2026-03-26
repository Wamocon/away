import { uploadTemplate, getTemplatesForOrg } from '../template';

describe('template lib', () => {
  it('should provide a function to upload template', () => {
    expect(typeof uploadTemplate).toBe('function');
  });
  it('should provide a function to get templates for org', () => {
    expect(typeof getTemplatesForOrg).toBe('function');
  });
});
