// src/reducers/predictions.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  allPredictions: [],
  userProductivity: []
};

export const predictionsSlice = createSlice({
  name: "predictions",
  initialState,
  reducers: {
    SET_ALL_TASK_PREDICTIONS: (state, action) => {
      state.allPredictions = action.payload;
    },
    SET_USER_PRODUCTIVITY: (state, action) => {
      state.userProductivity = action.payload;
    }
  },
});

export const {
  SET_ALL_TASK_PREDICTIONS,
  SET_USER_PRODUCTIVITY
} = predictionsSlice.actions;

export default predictionsSlice.reducer;