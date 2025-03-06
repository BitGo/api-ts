import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';
import { useColorMode } from '@docusaurus/theme-common';

function Feature({ lightSvg, darkSvg, title, description }) {
  const { colorMode } = useColorMode();
  const isDarkTheme = colorMode === 'dark';
  const Svg = isDarkTheme ? darkSvg : lightSvg;

  return (
    <div className={clsx('col col--4')} style={{ marginBottom: '2rem' }}>
      <div className={styles.featureCard}>
        <div className="text--center">
          <Svg className={styles.featureSvg} role="img" />
        </div>
        <div className="text--center padding-horiz--md">
          <h3 className={styles.featureTitle}>{title}</h3>
          <div className={styles.featureDescription}>{description}</div>
        </div>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  const FeatureList = [
    {
      title: 'Client',
      lightSvg: require('@site/static/img/ui-access-m-light-blue.svg').default,
      darkSvg: require('@site/static/img/ui-access-m-dark-blue.svg').default,
      description: (
        <>
          <div>Type-safe API requests with compile-time validation</div>
          <div>Automatic response decoding with proper error handling</div>
          <div>Seamless integration with Express and Superagent</div>
        </>
      ),
    },
    {
      title: 'API Specification',
      lightSvg: require('@site/static/img/api-m-light-blue.svg').default,
      darkSvg: require('@site/static/img/api-m-dark-blue.svg').default,
      description: (
        <>
          <div>io-ts powered type definitions with runtime validation</div>
          <div>OpenAPI specification generation from TypeScript</div>
          <div>Shared contract between client and server</div>
        </>
      ),
    },
    {
      title: 'Server',
      lightSvg: require('@site/static/img/view-rewards-m-light-blue.svg').default,
      darkSvg: require('@site/static/img/view-rewards-m-dark-blue.svg').default,
      description: (
        <>
          <div>End-to-end type safety from request to response</div>
          <div>Middleware chaining with preserved type information</div>
          <div>Express-compatible with enhanced error handling</div>
        </>
      ),
    },
  ];

  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
