import axios from "axios";
import { setErrors } from "../reducers/errors";
import swal from "sweetalert";
import {
  _setRoles,
  _addRole,
  _updateRole,
  _deleteRole,
  _setGeneratedDescription,
} from "../reducers/roles";
import { setRefresh } from "../reducers/commons";

// Fetch all roles
export const fetchRolesAction = () => async (dispatch) => {
  try {
    const res = await axios.get("/api/roles");
    dispatch(_setRoles(res.data.data));
  } catch (err) {
    dispatch(setErrors(err?.response?.data));
  }
};

// Create a new role
export const createRoleAction = (roleData) => async (dispatch) => {
  try {
    const res = await axios.post("/api/roles", roleData);
    dispatch(_addRole(res.data.data));
    swal("Success", "Role created successfully", "success");
    return res.data.data;
  } catch (err) {
    dispatch(setErrors(err?.response?.data));
    throw err;
  }
};

// Update an existing role
export const updateRoleAction = (id, roleData) => async (dispatch) => {
  dispatch(setRefresh(true));
  try {
    const res = await axios.put(`/api/roles/${id}`, roleData);
    dispatch(_updateRole(res.data.data));
    swal("Success", "Role updated successfully", "success");
    setTimeout(() => {
      dispatch(setRefresh(false));
    }, 2000);
    return res.data.data;
  } catch (err) {
    dispatch(setErrors(err?.response?.data));
    dispatch(setRefresh(false));
    throw err;
  }
};

// Delete a role
export const deleteRoleAction = (id) => async (dispatch) => {
  try {
    await axios.delete(`/api/roles/${id}`);
    dispatch(_deleteRole(id));
    swal("Success", "Role deleted successfully", "success");
  } catch (err) {
    dispatch(setErrors(err?.response?.data));
    throw err;
  }
};

// Generate role description
export const generateDescriptionAction = (roleName) => async (dispatch) => {
  try {
    const res = await axios.post("/api/roles/generate-description", { roleName });
    dispatch(_setGeneratedDescription(res.data.description));
    return res.data.description;
  } catch (err) {
    dispatch(setErrors(err?.response?.data));
    return "Responsible for managing tasks and system activities.";
  }
};