import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserState {
  displayName: string | null;
}

const initialState: UserState = {
  displayName: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<{ displayName: string }>) => {
      state.displayName = action.payload.displayName;
    },
    clearUser: (state) => {
      state.displayName = null;
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
