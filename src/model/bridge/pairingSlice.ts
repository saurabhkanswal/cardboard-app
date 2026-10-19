import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {PairingPayload} from './protocol';

/** The laptop bridge this app is paired with. In memory only for the POC (re-pair per launch). */
export interface PairingState {
  pairing: PairingPayload | null;
  bridgeName: string | null;
}

const initialState: PairingState = {pairing: null, bridgeName: null};

export const pairingSlice = createSlice({
  name: 'pairing',
  initialState,
  reducers: {
    paired(
      state,
      action: PayloadAction<{pairing: PairingPayload; bridgeName: string}>,
    ) {
      state.pairing = action.payload.pairing;
      state.bridgeName = action.payload.bridgeName;
    },
    unpaired() {
      return initialState;
    },
  },
});

export const {paired, unpaired} = pairingSlice.actions;

/** Selector typed structurally so this file needn't import the store (avoids a cycle). */
export const selectPairing = (state: {pairing: PairingState}) => state.pairing;
