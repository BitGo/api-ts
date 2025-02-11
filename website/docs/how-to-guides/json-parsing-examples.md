# JSON Parsing and Type Validation

Learn how to work with JSON data using TypeScript's type system and runtime validation.

## Parsing JSON from Strings

One common use case is parsing JSON from string input and validating its structure. Here's how you can create a type-safe parser:

```typescript
// Define the expected structure
interface User {
  name: string;
  age: number;
}

// Type guard to validate the structure
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof (value as User).name === 'string' &&
    'age' in value &&
    typeof (value as User).age === 'number'
  );
}

// Parser that combines JSON parsing and validation
function parseUser(input: string): Result<User> {
  try {
    const parsed = JSON.parse(input);
    if (isUser(parsed)) {
      return {
        success: true,
        value: parsed
      };
    }
    return {
      success: false,
      error: 'Invalid user structure'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid JSON'
    };
  }
}

// Type for the result
interface Result<T> {
  success: boolean;
  value?: T;
  error?: string;
}

// Usage examples:
const validJson = '{"name": "Alice", "age": 30}';
const invalidJson = '{"name": "Bob"'; // Missing closing brace
const invalidStructure = '{"name": "Charlie"}'; // Missing age field

console.log(parseUser(validJson));
// { success: true, value: { name: "Alice", age: 30 } }

console.log(parseUser(invalidJson));
// { success: false, error: "Unexpected end of JSON input" }

console.log(parseUser(invalidStructure));
// { success: false, error: "Invalid user structure" }
```

## Advanced Transformations

You can create more complex parsers that handle data transformations:

```typescript
interface UserWithDate {
  name: string;
  birthDate: Date;
}

function isISODateString(value: string): boolean {
  const date = new Date(value);
  return date instanceof Date && !isNaN(date.getTime());
}

function parseUserWithDate(input: string): Result<UserWithDate> {
  try {
    const parsed = JSON.parse(input);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.name === 'string' &&
      typeof parsed.birthDate === 'string' &&
      isISODateString(parsed.birthDate)
    ) {
      return {
        success: true,
        value: {
          name: parsed.name,
          birthDate: new Date(parsed.birthDate)
        }
      };
    }
    return {
      success: false,
      error: 'Invalid user structure or date format'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid JSON'
    };
  }
}

// Usage
const input = '{"name": "Alice", "birthDate": "1990-01-01T00:00:00.000Z"}';
console.log(parseUserWithDate(input));
// { success: true, value: { name: "Alice", birthDate: Date(1990-01-01) } }
```

## Error Handling

The Result type provides a clean way to handle parsing and validation errors:

```typescript
function processUser(input: string): string {
  const result = parseUser(input);
  if (result.success && result.value) {
    return `Valid user: ${result.value.name}, ${result.value.age}`;
  }
  return `Validation failed: ${result.error}`;
}

console.log(processUser('{"name": "Alice", "age": "30"}')); 
// Validation failed: Invalid user structure
```

## Best Practices

1. **Type Safety**: Use TypeScript interfaces to define expected data structures
2. **Type Guards**: Implement thorough type guards for runtime validation
3. **Error Handling**: Use a Result type to handle both success and error cases
4. **Transformation**: Keep parsing and transformation logic separate and composable
5. **Validation**: Include detailed validation messages for better debugging

Remember that TypeScript's type system provides compile-time safety, while runtime validation ensures data integrity during execution.
