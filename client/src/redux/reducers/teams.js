import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  _ALL: [],          // All teams in the system
  _USER: {           // Teams specific to the current user
    created: [],     // Teams created by the user
    joined: [],      // Teams the user has joined
    all: []          // Combined list of created and joined teams
  },
  _CURRENT: {},      // Currently selected team (for viewing/editing)
  _ONE: null,        // Single team details
  _MEMBERS: [],      // Members of the current team
  loading: false,    // Loading state
  error: null        // Error state
};

export const teamsSlice = createSlice({
  name: "teams",
  initialState,
  reducers: {
    loading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    _AddTeam: (state, action) => {
      state._ALL = [...state._ALL, action.payload];
      state._USER.created = [...state._USER.created, action.payload];
      state._USER.all = [...state._USER.all, action.payload];
    },
    _FindTeams: (state, action) => {
      state._ALL = action.payload;
    },
    _DeleteTeam: (state, action) => {
      state._ALL = state._ALL.filter((team) => team._id !== action.payload);
      state._USER.created = state._USER.created.filter((team) => team._id !== action.payload);
      state._USER.joined = state._USER.joined.filter((team) => team._id !== action.payload);
      state._USER.all = state._USER.all.filter((team) => team._id !== action.payload);
    },
    _FindOneTeam: (state, action) => {
      state._ONE = action.payload;
      state._MEMBERS = action.payload.members || [];
      state.loading = false;
      state.error = null;
    },
    _ResetCurrentTeam: (state) => {
      state._ONE = null;
      state._MEMBERS = [];
    },
    _SetCurrentTeam: (state, action) => {
      state._CURRENT = action.payload;
    },
    _SetUserTeams: (state, action) => {
      state._USER = {
        created: action.payload.createdTeams || [],
        joined: action.payload.joinedTeams || [],
        all: action.payload.allTeams || []
      };
    },
    _UpdateTeam: (state, action) => {
      const { id, updates } = action.payload;
      
      // Update in all collections
      state._ALL = state._ALL.map(team => 
        team._id === id ? { ...team, ...updates } : team
      );
      
      state._USER.created = state._USER.created.map(team => 
        team._id === id ? { ...team, ...updates } : team
      );
      
      state._USER.joined = state._USER.joined.map(team => 
        team._id === id ? { ...team, ...updates } : team
      );
      
      state._USER.all = state._USER.all.map(team => 
        team._id === id ? { ...team, ...updates } : team
      );
      
      // Update current team if it's the one being edited
      if (state._ONE && state._ONE._id === id) {
        state._ONE = { ...state._ONE, ...updates };
        state._MEMBERS = updates.members || state._MEMBERS;
      }
      
      if (state._CURRENT._id === id) {
        state._CURRENT = { ...state._CURRENT, ...updates };
      }
    },
    _AddTeamMember: (state, action) => {
      const { teamId, member } = action.payload;
      
      // Update in main teams collection
      state._ALL = state._ALL.map(team => {
        if (team._id === teamId) {
          const members = Array.isArray(team.members) ? [...team.members] : [];
          return {
            ...team,
            members: [...members, member]
          };
        }
        return team;
      });
      
      // Update in user teams if exists
      state._USER.all = state._USER.all.map(team => {
        if (team._id === teamId) {
          const members = Array.isArray(team.members) ? [...team.members] : [];
          return {
            ...team,
            members: [...members, member]
          };
        }
        return team;
      });
      
      // Update current team if it's the one being modified
      if (state._ONE && state._ONE._id === teamId) {
        const members = Array.isArray(state._ONE.members) ? [...state._ONE.members] : [];
        state._ONE.members = [...members, member];
        state._MEMBERS = [...state._MEMBERS, member];
      }
    },
    _RemoveTeamMember: (state, action) => {
      const { teamId, userId } = action.payload;
      
      // Update in main teams collection
      state._ALL = state._ALL.map(team => {
        if (team._id === teamId && Array.isArray(team.members)) {
          return {
            ...team,
            members: team.members.filter(m => m.user._id !== userId)
          };
        }
        return team;
      });
      
      // Update in user teams if exists
      state._USER.all = state._USER.all.map(team => {
        if (team._id === teamId && Array.isArray(team.members)) {
          return {
            ...team,
            members: team.members.filter(m => m.user._id !== userId)
          };
        }
        return team;
      });
      
      // Update current team if it's the one being modified
      if (state._ONE && state._ONE._id === teamId) {
        if (Array.isArray(state._ONE.members)) {
          state._ONE.members = state._ONE.members.filter(m => m.user._id !== userId);
        }
        if (Array.isArray(state._MEMBERS)) {
          state._MEMBERS = state._MEMBERS.filter(m => m.user._id !== userId);
        }
      }
    },
    _UpdateMemberRole: (state, action) => {
      const { teamId, userId, role } = action.payload;
      
      // Update in main teams collection
      state._ALL = state._ALL.map(team => {
        if (team._id === teamId && Array.isArray(team.members)) {
          return {
            ...team,
            members: team.members.map(m => 
              m.user._id === userId ? { ...m, role } : m
            )
          };
        }
        return team;
      });
      
      // Update in user teams if exists
      state._USER.all = state._USER.all.map(team => {
        if (team._id === teamId && Array.isArray(team.members)) {
          return {
            ...team,
            members: team.members.map(m => 
              m.user._id === userId ? { ...m, role } : m
            )
          };
        }
        return team;
      });
      
      // Update current team if it's the one being modified
      if (state._ONE && state._ONE._id === teamId) {
        if (Array.isArray(state._ONE.members)) {
          state._ONE.members = state._ONE.members.map(m => 
            m.user._id === userId ? { ...m, role } : m
          );
        }
        if (Array.isArray(state._MEMBERS)) {
          state._MEMBERS = state._MEMBERS.map(m => 
            m.user._id === userId ? { ...m, role } : m
          );
        }
      }
    }
  }
});

export const {
  loading,
  setError,
  clearError,
  _AddTeam,
  _FindTeams,
  _FindOneTeam,
  _SetCurrentTeam,
  _DeleteTeam,
  _SetUserTeams,
  _UpdateTeam,
  _AddTeamMember,
  _RemoveTeamMember,
  _UpdateMemberRole,
  _ResetCurrentTeam
} = teamsSlice.actions;

export default teamsSlice.reducer;