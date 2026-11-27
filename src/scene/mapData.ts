// Generated from OpenStreetMap and OpenTopoData. Do not hand-edit.
// BBox from maps skill: Ciapus, Ciomas, Bogor (OSM relation 19957780).

export interface MapRiver {
  id: string;
  nama: string;
  points: readonly (readonly [number, number])[];
  width: number;
  color: string;
  label: readonly [number, number];
  showLabel: boolean;
  selectable: boolean;
}

export const RIVERS: readonly MapRiver[] = [
  {
    id: 'cisadane',
    nama: 'Sungai Cisadane',
    points: [[42.0, 10.35], [40.48, 9.01], [39.11, 5.93], [41.28, -3.57], [39.11, -7.16], [36.6, -9.45], [37.54, -16.98], [36.91, -18.05], [32.67, -19.82], [30.23, -25.17], [24.31, -30.27]],
    width: 3.0,
    color: '#2f86b8',
    label: [36.87, -11.63],
    showLabel: true,
    selectable: true,
  },
  {
    id: 'cisindangbarang',
    nama: 'Sungai Cisindangbarang',
    points: [[24.31, -30.27], [21.76, -33.15], [16.46, -36.0]],
    width: 2.4,
    color: '#3b9ac7',
    label: [20.8, -33.66],
    showLabel: true,
    selectable: true,
  },
  {
    id: 'cikarti',
    nama: 'Sungai Cikarti',
    points: [[-24.45, -36.0], [-25.53, -33.43], [-25.39, -31.55], [-23.44, -31.66], [-23.96, -29.04], [-25.85, -27.55], [-25.73, -26.25], [-24.36, -25.57], [-25.18, -24.41], [-23.05, -22.86], [-20.95, -24.05], [-21.65, -21.12], [-19.53, -19.98]],
    width: 1.5,
    color: '#49a9d0',
    label: [-25.55, -26.16],
    showLabel: true,
    selectable: true,
  },
  {
    id: 'stream-tenggara',
    nama: '',
    points: [[11.21, 36.0], [13.22, 32.04], [11.81, 31.59], [9.01, 27.59], [8.05, 25.36], [8.56, 22.09], [7.92, 20.12], [9.16, 19.05], [10.96, 19.56], [11.88, 18.79], [12.41, 16.97], [14.27, 15.54], [18.03, 6.67], [13.06, -6.36], [7.89, -10.47], [11.46, -11.38], [11.28, -12.51], [9.57, -13.57], [13.62, -17.28], [12.91, -19.56], [16.21, -23.38]],
    width: 1.4,
    color: '#49a9d0',
    label: [17.47, 5.21],
    showLabel: false,
    selectable: false,
  },
];

export interface MapRoad {
  id: string;
  nama: string;
  points: readonly (readonly [number, number])[];
  width: number;
  bridge?: boolean;
  tunnel?: boolean;
}

export { MAPPED_ROADS as ROADS } from './osmCiapus.js';
