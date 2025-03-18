import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
    token: string;
    email: string;
}

const initialState: AuthState = {
    token: "",
    email: "",
};

export const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setToken: (state, action: PayloadAction<string>) => {
            state.token = action.payload
        },
        setEmail: (state, action: PayloadAction<string>) => {
            state.email = action.payload;
        },
        resetAuth: (state) => {
            state.token = "";
            state.email = "";
        },
    },
});

export const { setToken, setEmail, resetAuth } = authSlice.actions;
export default authSlice.reducer;
