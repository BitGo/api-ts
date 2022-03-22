local images = {
  nodejs: '199765120567.dkr.ecr.us-west-2.amazonaws.com/docker.io/library/node:16.13.2-alpine3.15@sha256:f21f35732964a96306a84a8c4b5a829f6d3a0c5163237ff4b6b8b34f8d70064b',
};

local test = {
  name: 'test',
  image: images.nodejs,
  commands: [
    'npm install',
    'npm run build',
    'npm test',
  ],
};

[
  {
    kind: 'pipeline',
    type: 'kubernetes',
    name: 'test-pull-request',
    steps: [
      test,
    ],
    trigger: {
      event: [
        'pull_request',
      ],
    },
  },
  {
    kind: 'pipeline',
    type: 'kubernetes',
    name: 'test-push',
    steps: [
      test,
    ],
    trigger: {
      event: [
        'push',
      ],
      ref: {
        include: [
          'refs/heads/master',
        ],
      },
    },
  },
]
