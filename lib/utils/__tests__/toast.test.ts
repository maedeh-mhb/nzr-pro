import { showToast, showSuccess, showError, showWarning, showInfo } from '../toast'

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}))

describe('Toast Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('showToast calls toast with correct message', () => {
    const toast = require('react-hot-toast').toast
    showToast('Test message', 'info')
    expect(toast.info).toHaveBeenCalledWith('Test message', expect.any(Object))
  })

  it('showSuccess calls toast.success', () => {
    const toast = require('react-hot-toast').toast
    showSuccess('Success message')
    expect(toast.success).toHaveBeenCalledWith('Success message', expect.any(Object))
  })

  it('showError calls toast.error', () => {
    const toast = require('react-hot-toast').toast
    showError('Error message')
    expect(toast.error).toHaveBeenCalledWith('Error message', expect.any(Object))
  })

  it('showWarning calls toast.warning', () => {
    const toast = require('react-hot-toast').toast
    showWarning('Warning message')
    expect(toast.warning).toHaveBeenCalledWith('Warning message', expect.any(Object))
  })

  it('showInfo calls toast.info', () => {
    const toast = require('react-hot-toast').toast
    showInfo('Info message')
    expect(toast.info).toHaveBeenCalledWith('Info message', expect.any(Object))
  })

  it('uses custom duration when provided', () => {
    const toast = require('react-hot-toast').toast
    showSuccess('Message', { duration: 5000 })
    expect(toast.success).toHaveBeenCalledWith(
      'Message',
      expect.objectContaining({ duration: 5000 })
    )
  })

  it('uses custom position when provided', () => {
    const toast = require('react-hot-toast').toast
    showSuccess('Message', { position: 'bottom-right' })
    expect(toast.success).toHaveBeenCalledWith(
      'Message',
      expect.objectContaining({ position: 'bottom-right' })
    )
  })
})

