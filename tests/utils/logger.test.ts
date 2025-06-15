import logger from '../../src/utils/logger';

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe('Logger', () => {
  beforeEach(() => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  it('should log info messages', () => {
    logger.info('Test info message');
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]'),
      ''
    );
  });

  it('should log error messages', () => {
    logger.error('Test error message');
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR]'),
      ''
    );
  });

  it('should log warning messages', () => {
    logger.warn('Test warning message');
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[WARN]'),
      ''
    );
  });

  it('should log with metadata', () => {
    const metadata = { userId: 123, action: 'login' };
    logger.info('User action', metadata);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]'),
      JSON.stringify(metadata)
    );
  });

  it('should log debug messages in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    logger.debug('Debug message');
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[DEBUG]'),
      ''
    );
    
    process.env.NODE_ENV = originalEnv;
  });

  it('should not log debug messages in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    logger.debug('Debug message');
    expect(console.log).not.toHaveBeenCalled();
    
    process.env.NODE_ENV = originalEnv;
  });
}); 