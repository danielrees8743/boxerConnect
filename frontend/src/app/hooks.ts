import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './store';

/**
 * Typed version of useDispatch hook.
 * Use throughout the app instead of plain `useDispatch`.
 *
 * @example
 * const dispatch = useAppDispatch();
 * dispatch(loginUser({ email, password }));
 */
export const useAppDispatch: () => AppDispatch = useDispatch;

/**
 * Typed version of useSelector hook.
 * Use throughout the app instead of plain `useSelector`.
 *
 * @example
 * const user = useAppSelector((state) => state.auth.user);
 * const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
