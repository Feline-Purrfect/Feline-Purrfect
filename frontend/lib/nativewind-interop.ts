// NativeWind only maps `className` → `style` for React Native's own components.
// Register third-party components we style with classes here (imported once from app/_layout.tsx).
import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';

cssInterop(Image, { className: 'style' });
