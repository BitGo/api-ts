import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import { useColorMode } from '@docusaurus/theme-common';

import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  const { colorMode } = useColorMode();
  const isDarkTheme = colorMode === 'dark';

  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <div className="row">
          <div className="col col--7">
            <h1 className="hero__title">{siteConfig.title}</h1>
            <p
              className="hero__subtitle"
              style={{ color: isDarkTheme ? 'white' : '#0E0F0F' }}
            >
              {siteConfig.tagline}
            </p>
            <div className={styles.buttons}>
              <Link
                className={clsx('button button--primary button--lg', styles.button)}
                to="/docs/intro"
              >
                Get Started
              </Link>
              <Link
                className={clsx('button button--outline button--lg', styles.button)}
                to="https://github.com/BitGo/api-ts"
              >
                View on GitHub
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - ${siteConfig.tagline}`}
      description="Type- and runtime- safe TypeScript APIs with BitGo's api-ts"
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
