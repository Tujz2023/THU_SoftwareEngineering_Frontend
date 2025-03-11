import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
    token: string;
    name: string;
}

const initialState: AuthState = {
    token: "",
    name: "",
};

/**
 * @todo [Step 4] 请在下述一处代码缺失部分以正确设置 JWT 信息
 */
export const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setToken: (state, action: PayloadAction<string>) => {
            // Step 4 BEGIN
            state.token = action.payload
            // Step 4 END
        },
        setName: (state, action: PayloadAction<string>) => {
            state.name = action.payload;
        },
        resetAuth: (state) => {
            state.token = "";
            state.name = "";
        },
    },
});

export const { setToken, setName, resetAuth } = authSlice.actions;
export default authSlice.reducer;
