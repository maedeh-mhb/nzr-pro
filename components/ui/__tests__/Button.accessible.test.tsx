import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import Button from '../Button'

expect.extend(toHaveNoViolations)

describe('Button Accessibility', () => {
  it('should not have any accessibility violations', async () => {
    const { container } = render(<Button>Accessible Button</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have proper ARIA attributes when disabled', async () => {
    const { container } = render(<Button disabled>Disabled Button</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should be keyboard accessible', async () => {
    const { container } = render(<Button>Keyboard Button</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

