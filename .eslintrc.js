module.exports = {
  root: true,
  extends: ['@react-native', 'plugin:boundaries/recommended'],
  plugins: ['boundaries'],
  settings: {
    // Resolve extensionless TS/TSX imports so boundaries can classify local files.
    'import/resolver': {
      node: {extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']},
    },
    // Map each folder to an architectural layer ("element type").
    'boundaries/include': ['src/**/*'],
    // Classify every file under a layer folder (incl. nested paths) by its type.
    'boundaries/elements': [
      {type: 'app', pattern: 'src/app'},
      {type: 'model', pattern: 'src/model'},
      {type: 'viewmodel', pattern: 'src/viewmodel'},
      {type: 'screens', pattern: 'src/screens'},
      {type: 'components', pattern: 'src/components'},
      {type: 'theme', pattern: 'src/theme'},
    ],
  },
  rules: {
    // Enforce the one-way layer dependencies:
    //   View → ViewController → ViewModel → Model
    // Anything not explicitly allowed between our layers is an error.
    'boundaries/dependencies': [
      'error',
      {
        default: 'disallow',
        policies: [
          // app is the composition root: it wires the store and navigation.
          {
            from: {element: {type: 'app'}},
            allow: {
              to: {
                element: {types: {anyOf: ['app', 'model', 'screens', 'theme']}},
              },
            },
          },
          // screens (View + ViewController) → viewmodel, components, theme. NOT model.
          {
            from: {element: {type: 'screens'}},
            allow: {
              to: {
                element: {types: {anyOf: ['viewmodel', 'components', 'theme']}},
              },
            },
          },
          // viewmodel → model only.
          {
            from: {element: {type: 'viewmodel'}},
            allow: {to: {element: {type: 'model'}}},
          },
          // components → components, theme only.
          {
            from: {element: {type: 'components'}},
            allow: {to: {element: {types: {anyOf: ['components', 'theme']}}}},
          },
          // model and theme depend on nothing app-internal (no allow policy).
        ],
      },
    ],
  },
};
