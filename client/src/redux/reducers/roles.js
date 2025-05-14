import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  roles: [],
  loadedRoles: false,
  currentRole: null,
  generatedDescription: "",
};

export const rolesSlice = createSlice({
  name: "roles",
  initialState,
  reducers: {
    _setRoles: (state, action) => {
      state.roles = action.payload;
      state.loadedRoles = true;
    },
    _addRole: (state, action) => {
      state.roles = [...state.roles, action.payload];
    },
    _updateRole: (state, action) => {
      state.roles = state.roles.map((role) =>
        role._id === action.payload._id ? action.payload : role
      );
      state.currentRole = action.payload;
    },
    _deleteRole: (state, action) => {
      state.roles = state.roles.filter((role) => role._id !== action.payload);
    },
    _setCurrentRole: (state, action) => {
      state.currentRole = action.payload;
    },
    _setGeneratedDescription: (state, action) => {
      state.generatedDescription = action.payload;
    },
  },
});

export const {
  _setRoles,
  _addRole,
  _updateRole,
  _deleteRole,
  _setCurrentRole,
  _setGeneratedDescription,
} = rolesSlice.actions;

export default rolesSlice.reducer;