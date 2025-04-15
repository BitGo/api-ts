import React from 'react';
import { useColorMode } from '@docusaurus/theme-common';

// A simpler implementation of the Spotlight component
export default function Spotlight() {
  // State to track the selected step
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  // Get the current color mode (light or dark)
  const { colorMode } = useColorMode();
  const isDarkTheme = colorMode === 'dark';

  // Define theme-specific colors
  const colors = {
    background: isDarkTheme ? '#1e293b' : '#f8fafc',
    border: isDarkTheme ? '#334155' : '#e2e8f0',
    borderActive: isDarkTheme ? '#60a5fa' : '#3b82f6',
    text: isDarkTheme ? '#f1f5f9' : '#0f172a',
    codeBackground: isDarkTheme ? '#0f172a' : '#f1f5f9',
    highlightBlue: isDarkTheme ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.15)',
    highlightRed: isDarkTheme ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.15)',
    highlightGreen: isDarkTheme
      ? 'rgba(16, 185, 129, 0.3)'
      : 'rgba(16, 185, 129, 0.15)',
  };

  // Define the steps manually based on the structure in the MDX file
  const steps = [
    {
      title: 'Working Route',
      content: (
        <div>
          <p>
            Consider this <code>httpRoute</code> that compiles successfully.
          </p>
        </div>
      ),
      code: (
        <pre className="language-typescript">
          <code className="language-typescript">
            {`import * as t from 'io-ts';
import { httpRoute, httpRequest } from '@api-ts/io-ts-http';

const GetHello = httpRoute({
  path: '/hello/{name}',
  method: 'GET',
  request: httpRequest({
    params: {
      name: t.string,
    },
  }),`}
            <span
              style={{
                backgroundColor: colors.highlightBlue,
                display: 'block',
                margin: '0 -1rem',
                padding: '0 1rem',
              }}
            >
              {`  response: {
    200: t.string,
  },`}
            </span>
            {`});
`}
          </code>
        </pre>
      ),
    },
    {
      title: 'Compilation Error',
      content: (
        <div>
          <p>
            If you add an expected <code>number</code> value to the{' '}
            <code>httpRoute</code>'s query parameters, you'll see the following
            compilation error:
          </p>
          <p>The error message looks like this:</p>
          <pre>
            <code>
              {`index.ts:16:7 - error TS2322:
  Codec's output type is not assignable to
  string | string[] | undefined.
  Try using one like \`NumberFromString\`

13       repeat: t.number`}
            </code>
          </pre>
          <p>
            Recall that <code>t.number</code> decodes an <code>unknown</code> value into
            a <code>number</code> without any manipulation of the starting value. If you
            started with a number, you'll decode a number.
          </p>
          <p>
            We need a codec that decodes a <code>string</code> into a{' '}
            <code>number</code> and converts the string-representation of a number into
            the <code>number</code> type.
          </p>
        </div>
      ),
      code: (
        <pre className="language-typescript">
          <code className="language-typescript">
            {`import * as t from 'io-ts';
import { httpRoute, httpRequest } from '@api-ts/io-ts-http';

const GetHello = httpRoute({
  path: '/hello/{name}',
  method: 'GET',
  request: httpRequest({
    params: {
      name: t.string,
    },
    query: {`}
            <span
              style={{
                backgroundColor: colors.highlightRed,
                display: 'block',
                margin: '0 -1rem',
                padding: '0 1rem',
              }}
            >
              {`      repeat: t.number, // Compilation error!`}
            </span>
            {`    },
  }),
  response: {
    200: t.string,
  },
});`}
          </code>
        </pre>
      ),
    },
    {
      title: 'Solution',
      content: (
        <div>
          <p>
            This is a fairly common requirement, so this codec already exists:{' '}
            <a href="https://github.com/gcanti/io-ts-types">io-ts-types</a> offers the{' '}
            <a href="https://gcanti.github.io/io-ts-types/modules/NumberFromString.ts.html">
              NumberFromString
            </a>{' '}
            codec that decodes a <code>string</code> value into a <code>number</code>.
            Use
            <code>NumberFromString</code> to fix your compilation error.
          </p>
        </div>
      ),
      code: (
        <pre className="language-typescript">
          <code className="language-typescript">
            {`import * as t from 'io-ts';
`}
            <span
              style={{
                backgroundColor: colors.highlightGreen,
                display: 'block',
                margin: '0 -1rem',
                padding: '0 1rem',
              }}
            >
              {`import { NumberFromString } from 'io-ts-types';`}
            </span>
            {`import { httpRoute, httpRequest } from '@api-ts/io-ts-http';

const GetHello = httpRoute({
  path: '/hello/{name}',
  method: 'GET',
  request: httpRequest({
    params: {
      name: t.string,
    },
    query: {`}
            <span
              style={{
                backgroundColor: colors.highlightGreen,
                display: 'block',
                margin: '0 -1rem',
                padding: '0 1rem',
              }}
            >
              {`      repeat: NumberFromString,`}
            </span>
            {`    },
  }),
  response: {
    200: t.string,
  },
});`}
          </code>
        </pre>
      ),
    },
  ];

  return (
    <div className="spotlight-container">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: '300px' }}>
            {steps.map((step, i) => (
              <div
                key={i}
                onClick={() => setSelectedIndex(i)}
                style={{
                  borderLeft: `4px solid ${selectedIndex === i ? colors.borderActive : colors.border}`,
                  padding: '1rem',
                  marginBottom: '1rem',
                  borderRadius: '0.25rem',
                  backgroundColor: colors.background,
                  color: colors.text,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <h3
                  style={{
                    marginTop: '0.5rem',
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                  }}
                >
                  {step.title}
                </h3>
                <div>{step.content}</div>
              </div>
            ))}
          </div>
          <div
            style={{
              flex: 1,
              minWidth: '300px',
              position: 'sticky',
              top: '5rem',
              backgroundColor: colors.codeBackground,
              borderRadius: '0.25rem',
              padding: '0.5rem',
              transition: 'background-color 0.2s ease',
            }}
          >
            <div style={{ overflow: 'auto' }}>{steps[selectedIndex]?.code}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
