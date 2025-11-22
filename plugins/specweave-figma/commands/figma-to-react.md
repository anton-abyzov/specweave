# /specweave-figma:to-react

Convert Figma components to production-ready React components with TypeScript, styled-components, and responsive design.

You are a Figma-to-React conversion expert who generates pixel-perfect, type-safe React components from Figma designs.

## Your Task

Transform Figma components into React components with proper TypeScript types, styling, accessibility, and responsive behavior.

### 1. Conversion Architecture

**Design-to-Code Pipeline**:
```
Figma Component → Analyze Structure → Extract Props → Generate TSX → Apply Styles → Add Interactivity
```

**Supported Patterns**:
- Functional components with hooks
- TypeScript interfaces for props
- Styled-components or CSS modules
- Responsive design (mobile-first)
- Accessibility attributes (ARIA)
- Component variants (Figma properties)
- Auto-layout → Flexbox/Grid

### 2. Component Analysis

**Figma Node Structure**:
```typescript
interface FigmaNode {
  id: string;
  name: string;
  type: 'COMPONENT' | 'FRAME' | 'TEXT' | 'RECTANGLE' | 'VECTOR';
  children?: FigmaNode[];

  // Layout
  absoluteBoundingBox: { x: number; y: number; width: number; height: number };
  layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  layoutAlign?: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH';
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;

  // Styling
  fills?: Fill[];
  strokes?: Stroke[];
  effects?: Effect[];
  cornerRadius?: number;

  // Text
  characters?: string;
  style?: TextStyle;

  // Component properties (variants)
  componentPropertyDefinitions?: Record<string, ComponentProperty>;
}
```

**Extract Component Metadata**:
```typescript
function analyzeComponent(node: FigmaNode) {
  return {
    name: node.name,
    type: inferComponentType(node),
    props: extractProps(node),
    children: node.children?.map(analyzeComponent) || [],
    layout: extractLayout(node),
    styling: extractStyling(node),
    text: node.type === 'TEXT' ? node.characters : null,
    variants: node.componentPropertyDefinitions || {},
  };
}

function inferComponentType(node: FigmaNode): string {
  // Button detection
  if (node.name.toLowerCase().includes('button')) return 'Button';

  // Input detection
  if (node.name.toLowerCase().includes('input')) return 'Input';

  // Card detection
  if (node.name.toLowerCase().includes('card')) return 'Card';

  // Icon detection
  if (node.type === 'VECTOR') return 'Icon';

  // Text detection
  if (node.type === 'TEXT') return 'Text';

  // Generic container
  return 'Container';
}
```

### 3. React Component Generation

**TypeScript Component Template**:

```typescript
import { FC } from 'react';
import styled from 'styled-components';

// Generated interfaces from Figma component properties
interface ${ComponentName}Props {
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}

const ${ComponentName}: FC<${ComponentName}Props> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onClick,
  children,
}) => {
  return (
    <StyledContainer
      variant={variant}
      size={size}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </StyledContainer>
  );
};

const StyledContainer = styled.div<${ComponentName}Props>`
  /* Generated styles from Figma */
`;

export default ${ComponentName};
```

**Complete Example - Button Component**:

```typescript
import { FC, ButtonHTMLAttributes } from 'react';
import styled from 'styled-components';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
}

const Button: FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  loading = false,
  disabled,
  children,
  ...props
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled || loading}
      {...props}
    >
      {leftIcon && <IconWrapper>{leftIcon}</IconWrapper>}
      {loading ? <Spinner /> : children}
      {rightIcon && <IconWrapper>{rightIcon}</IconWrapper>}
    </StyledButton>
  );
};

const StyledButton = styled.button<ButtonProps>`
  /* Base styles */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  /* Full width */
  width: ${({ fullWidth }) => fullWidth ? '100%' : 'auto'};

  /* Size variants */
  ${({ size }) => {
    switch (size) {
      case 'sm':
        return `
          padding: 8px 16px;
          font-size: 14px;
          line-height: 20px;
        `;
      case 'lg':
        return `
          padding: 16px 32px;
          font-size: 18px;
          line-height: 24px;
        `;
      default: // md
        return `
          padding: 12px 24px;
          font-size: 16px;
          line-height: 24px;
        `;
    }
  }}

  /* Color variants */
  ${({ variant }) => {
    switch (variant) {
      case 'primary':
        return `
          background: #0066FF;
          color: #FFFFFF;

          &:hover:not(:disabled) {
            background: #0052CC;
          }

          &:active:not(:disabled) {
            background: #003D99;
          }
        `;
      case 'secondary':
        return `
          background: #F0F0F0;
          color: #333333;

          &:hover:not(:disabled) {
            background: #E0E0E0;
          }

          &:active:not(:disabled) {
            background: #D0D0D0;
          }
        `;
      case 'outline':
        return `
          background: transparent;
          color: #0066FF;
          border: 2px solid #0066FF;

          &:hover:not(:disabled) {
            background: rgba(0, 102, 255, 0.1);
          }

          &:active:not(:disabled) {
            background: rgba(0, 102, 255, 0.2);
          }
        `;
    }
  }}

  /* Disabled state */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Focus state (accessibility) */
  &:focus-visible {
    outline: 2px solid #0066FF;
    outline-offset: 2px;
  }
`;

const IconWrapper = styled.span`
  display: inline-flex;
  align-items: center;
`;

const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export default Button;
```

### 4. Style Conversion

**Figma → CSS Mapping**:

```typescript
function convertFigmaStylesToCSS(node: FigmaNode): string {
  const styles: string[] = [];

  // Layout (Auto Layout → Flexbox)
  if (node.layoutMode) {
    styles.push('display: flex;');
    styles.push(`flex-direction: ${node.layoutMode === 'HORIZONTAL' ? 'row' : 'column'};`);

    if (node.layoutAlign) {
      const alignMap = {
        MIN: 'flex-start',
        CENTER: 'center',
        MAX: 'flex-end',
        STRETCH: 'stretch',
      };
      styles.push(`align-items: ${alignMap[node.layoutAlign]};`);
    }

    if (node.itemSpacing) {
      styles.push(`gap: ${node.itemSpacing}px;`);
    }
  }

  // Padding
  if (node.paddingLeft || node.paddingRight || node.paddingTop || node.paddingBottom) {
    const padding = [
      node.paddingTop || 0,
      node.paddingRight || 0,
      node.paddingBottom || 0,
      node.paddingLeft || 0,
    ].join('px ');
    styles.push(`padding: ${padding}px;`);
  }

  // Size
  const box = node.absoluteBoundingBox;
  if (node.primaryAxisSizingMode === 'FIXED') {
    const dim = node.layoutMode === 'HORIZONTAL' ? 'width' : 'height';
    styles.push(`${dim}: ${box.width}px;`);
  }

  // Background (fills)
  if (node.fills && node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill.type === 'SOLID') {
      const color = rgbaToCSS(fill.color, fill.opacity);
      styles.push(`background: ${color};`);
    } else if (fill.type === 'GRADIENT_LINEAR') {
      const gradient = convertGradient(fill);
      styles.push(`background: ${gradient};`);
    }
  }

  // Border (strokes)
  if (node.strokes && node.strokes.length > 0) {
    const stroke = node.strokes[0];
    const color = rgbaToCSS(stroke.color, stroke.opacity);
    const width = node.strokeWeight || 1;
    styles.push(`border: ${width}px solid ${color};`);
  }

  // Border radius
  if (node.cornerRadius) {
    styles.push(`border-radius: ${node.cornerRadius}px;`);
  }

  // Shadows (effects)
  if (node.effects && node.effects.length > 0) {
    const shadows = node.effects
      .filter((e: any) => e.type === 'DROP_SHADOW')
      .map((e: any) => {
        const color = rgbaToCSS(e.color, e.color.a);
        return `${e.offset.x}px ${e.offset.y}px ${e.radius}px ${color}`;
      })
      .join(', ');

    if (shadows) {
      styles.push(`box-shadow: ${shadows};`);
    }
  }

  // Typography (text styles)
  if (node.style) {
    styles.push(`font-family: '${node.style.fontFamily}', sans-serif;`);
    styles.push(`font-size: ${node.style.fontSize}px;`);
    styles.push(`font-weight: ${node.style.fontWeight};`);
    styles.push(`line-height: ${node.style.lineHeightPx}px;`);

    if (node.style.letterSpacing) {
      styles.push(`letter-spacing: ${node.style.letterSpacing}px;`);
    }

    if (node.style.textAlignHorizontal) {
      const alignMap = { LEFT: 'left', CENTER: 'center', RIGHT: 'right', JUSTIFIED: 'justify' };
      styles.push(`text-align: ${alignMap[node.style.textAlignHorizontal]};`);
    }
  }

  return styles.join('\n  ');
}

function rgbaToCSS(color: { r: number; g: number; b: number }, opacity = 1): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  return opacity === 1
    ? `rgb(${r}, ${g}, ${b})`
    : `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function convertGradient(fill: any): string {
  const stops = fill.gradientStops
    .map((stop: any) => {
      const color = rgbaToCSS(stop.color, stop.color.a);
      return `${color} ${Math.round(stop.position * 100)}%`;
    })
    .join(', ');

  const angle = Math.atan2(
    fill.gradientHandlePositions[1].y - fill.gradientHandlePositions[0].y,
    fill.gradientHandlePositions[1].x - fill.gradientHandlePositions[0].x
  ) * (180 / Math.PI);

  return `linear-gradient(${angle}deg, ${stops})`;
}
```

### 5. Responsive Design

**Generate Media Queries from Figma Breakpoints**:

```typescript
const breakpoints = {
  mobile: 375,
  tablet: 768,
  desktop: 1440,
};

const StyledCard = styled.div`
  /* Mobile-first base styles */
  padding: 16px;
  font-size: 14px;

  /* Tablet */
  @media (min-width: ${breakpoints.tablet}px) {
    padding: 24px;
    font-size: 16px;
  }

  /* Desktop */
  @media (min-width: ${breakpoints.desktop}px) {
    padding: 32px;
    font-size: 18px;
  }
`;
```

**Responsive Container**:
```typescript
const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;

  @media (min-width: 768px) {
    padding: 0 32px;
  }

  @media (min-width: 1440px) {
    padding: 0 64px;
  }
`;
```

### 6. Component Variants (Figma Properties)

**Figma Component Property → React Props**:

```typescript
// Figma component with variants:
// - State: Default, Hover, Active, Disabled
// - Size: Small, Medium, Large
// - Icon: None, Left, Right

interface ChipProps {
  state?: 'default' | 'hover' | 'active' | 'disabled';
  size?: 'sm' | 'md' | 'lg';
  iconPosition?: 'none' | 'left' | 'right';
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

const Chip: FC<ChipProps> = ({
  state = 'default',
  size = 'md',
  iconPosition = 'none',
  label,
  icon,
  onClick,
}) => {
  return (
    <StyledChip
      state={state}
      size={size}
      onClick={state !== 'disabled' ? onClick : undefined}
    >
      {iconPosition === 'left' && icon && <IconWrapper>{icon}</IconWrapper>}
      <Label>{label}</Label>
      {iconPosition === 'right' && icon && <IconWrapper>{icon}</IconWrapper>}
    </StyledChip>
  );
};

const StyledChip = styled.div<ChipProps>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 100px;
  font-weight: 500;
  cursor: ${({ state }) => state === 'disabled' ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;

  /* Size variants */
  ${({ size }) => {
    switch (size) {
      case 'sm': return `padding: 4px 12px; font-size: 12px;`;
      case 'lg': return `padding: 12px 20px; font-size: 16px;`;
      default: return `padding: 8px 16px; font-size: 14px;`;
    }
  }}

  /* State variants */
  ${({ state }) => {
    switch (state) {
      case 'hover':
        return `background: #E0F2FF; color: #0066FF;`;
      case 'active':
        return `background: #0066FF; color: #FFFFFF;`;
      case 'disabled':
        return `background: #F0F0F0; color: #A0A0A0; opacity: 0.6;`;
      default:
        return `background: #F0F0F0; color: #333333;`;
    }
  }}
`;
```

### 7. Accessibility (a11y)

**Add ARIA Attributes**:

```typescript
const AccessibleButton: FC<ButtonProps> = ({
  children,
  disabled,
  loading,
  ariaLabel,
  ...props
}) => {
  return (
    <button
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      disabled={disabled || loading}
      {...props}
    >
      {children}
    </button>
  );
};

// Icon buttons MUST have aria-label
const IconButton: FC<IconButtonProps> = ({ icon, onClick, ariaLabel }) => {
  return (
    <button
      aria-label={ariaLabel} // Required for screen readers
      onClick={onClick}
    >
      {icon}
    </button>
  );
};
```

**Semantic HTML**:
```typescript
// ❌ Wrong: div soup
<div onClick={onClick}>Submit</div>

// ✅ Correct: semantic button
<button onClick={onClick}>Submit</button>

// ❌ Wrong: generic div
<div>Card Title</div>

// ✅ Correct: heading
<h2>Card Title</h2>
```

### 8. Storybook Integration

**Generate Storybook Stories**:

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import Button from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
    fullWidth: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    size: 'md',
    children: 'Button',
  },
};

export const WithIcons: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    leftIcon: <IconArrowLeft />,
    rightIcon: <IconArrowRight />,
    children: 'Button',
  },
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    loading: true,
    children: 'Button',
  },
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    disabled: true,
    children: 'Button',
  },
};
```

### 9. Testing

**Generate Component Tests**:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders loading state correctly', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.queryByText('Click me')).not.toBeInTheDocument();
  });

  it('renders icons correctly', () => {
    render(
      <Button leftIcon={<span data-testid="left-icon">←</span>}>
        Click me
      </Button>
    );

    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
  });
});
```

### 10. Code Generation Automation

**Full Pipeline Script**:

```typescript
import { FigmaImporter } from './figma-importer';
import { generateReactComponent } from './react-generator';
import fs from 'fs/promises';

async function figmaToReact(fileKey: string, componentName: string) {
  // 1. Fetch component from Figma
  const importer = new FigmaImporter({
    accessToken: process.env.FIGMA_ACCESS_TOKEN!,
    fileKey,
  });

  const file = await importer.fetchFile();
  const component = findComponentByName(file.document, componentName);

  if (!component) {
    throw new Error(`Component "${componentName}" not found`);
  }

  // 2. Analyze component structure
  const analysis = analyzeComponent(component);

  // 3. Generate React component code
  const reactCode = generateReactComponent(analysis);

  // 4. Generate TypeScript types
  const types = generateTypeScriptTypes(analysis);

  // 5. Generate styled-components
  const styles = generateStyledComponents(analysis);

  // 6. Generate Storybook story
  const story = generateStorybook(analysis);

  // 7. Generate tests
  const tests = generateTests(analysis);

  // 8. Save files
  const componentDir = `./src/components/${analysis.name}`;
  await fs.mkdir(componentDir, { recursive: true });

  await fs.writeFile(`${componentDir}/${analysis.name}.tsx`, reactCode);
  await fs.writeFile(`${componentDir}/${analysis.name}.types.ts`, types);
  await fs.writeFile(`${componentDir}/${analysis.name}.styles.ts`, styles);
  await fs.writeFile(`${componentDir}/${analysis.name}.stories.tsx`, story);
  await fs.writeFile(`${componentDir}/${analysis.name}.test.tsx`, tests);
  await fs.writeFile(`${componentDir}/index.ts`, `export { default } from './${analysis.name}';`);

  console.log(`✅ Generated React component: ${analysis.name}`);
  console.log(`📁 Location: ${componentDir}`);
}

// Usage
figmaToReact('ABC123XYZ456', 'Button').catch(console.error);
```

## Workflow

1. Ask about Figma file and component to convert
2. Fetch component metadata from Figma API
3. Analyze component structure and variants
4. Ask about styling approach (styled-components, CSS modules, Tailwind)
5. Generate TypeScript component with props interface
6. Convert Figma styles to CSS/styled-components
7. Add responsive breakpoints if needed
8. Generate Storybook stories for all variants
9. Generate unit tests
10. Save all generated files and provide usage examples

## When to Use

- Converting Figma designs to React components
- Building design systems from Figma
- Automating component creation from mockups
- Ensuring pixel-perfect implementation
- Syncing Figma variants with React props
- Generating Storybook documentation from designs

## Best Practices

1. **Type Safety**: Always generate TypeScript interfaces
2. **Variants**: Map Figma component properties to React props
3. **Accessibility**: Include ARIA attributes and semantic HTML
4. **Responsive**: Generate mobile-first responsive styles
5. **Testing**: Create comprehensive unit tests
6. **Documentation**: Generate Storybook stories automatically
7. **Naming**: Use PascalCase for components, match Figma names
8. **Optimization**: Extract common styles to theme tokens

Transform Figma designs into production-ready React components!
