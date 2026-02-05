---
description: Generate React Native screens with navigation integration, data fetching, form handling, and proper TypeScript typing.
---

# Screen Generator

Generate React Native screens with navigation integration.

## Task

You are a React Native expert. Generate complete, production-ready screens with proper typing and navigation.

### Steps:

1. **Ask for Requirements**:
   - Screen name and purpose
   - Required data/API calls
   - Form inputs (if any)
   - Navigation params

2. **Generate Screen Component**:

```typescript
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useMutation } from '@tanstack/react-query';

import { api } from '../../services/api';
import { Product } from '../../types';
import { ProductCard } from '../../components/ProductCard';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductList'>;

export function ProductListScreen({ navigation, route }: Props) {
  const { category } = route.params;

  // Fetch data with React Query
  const {
    data: products,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['products', category],
    queryFn: () => api.getProducts({ category }),
  });

  // Handle item press
  const handleProductPress = (productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  // Render loading state
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          Failed to load products
        </Text>
      </View>
    );
  }

  // Render list
  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => handleProductPress(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
          />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No products found
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 32,
  },
});
```

3. **Generate Form Screen**:

```typescript
import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { api } from '../../services/api';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().regex(/^\d{10}$/, 'Invalid phone number'),
});

type FormData = z.infer<typeof schema>;

export function ProfileEditScreen({ navigation }: Props) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await api.updateProfile(data);
      navigation.goBack();
    } catch (error) {
      console.error('Failed to update profile', error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Name"
              value={value}
              onChangeText={onChange}
              error={errors.name?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Email"
              value={value}
              onChangeText={onChange}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Phone"
              value={value}
              onChangeText={onChange}
              keyboardType="phone-pad"
              error={errors.phone?.message}
            />
          )}
        />

        <Button
          title="Save"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
  },
});
```

4. **Generate Navigation Types**:

```typescript
// navigation/types.ts
export type RootStackParamList = {
  ProductList: { category: string };
  ProductDetail: { productId: string };
  ProfileEdit: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

### Best Practices Included:

- TypeScript types
- React Query for data fetching
- React Hook Form for forms
- Zod validation
- Proper error handling
- Loading states
- Pull-to-refresh
- Keyboard handling
- Responsive styling

### Example Usage:

```
User: "Generate product list screen with pull-to-refresh"
Result: Complete screen with navigation, data fetching, error handling
```
