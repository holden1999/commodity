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
    id: 'ci-apus',
    nama: 'Ci Apus',
    points: [[42.0, 10.35], [40.48, 9.01], [39.11, 5.93], [41.28, -3.57], [39.11, -7.16], [36.6, -9.45], [37.54, -16.98], [36.91, -18.05], [32.67, -19.82], [30.23, -25.17], [24.31, -30.27]],
    width: 3.0,
    color: '#2f86b8',
    label: [36.87, -11.63],
    showLabel: true,
    selectable: true,
  },
  {
    id: 'ciapus',
    nama: 'Ciapus',
    points: [[24.31, -30.27], [21.76, -33.15], [16.46, -36.0]],
    width: 2.4,
    color: '#3b9ac7',
    label: [20.8, -33.66],
    showLabel: true,
    selectable: true,
  },
  {
    id: 'stream-barat',
    nama: '',
    points: [[-24.45, -36.0], [-25.53, -33.43], [-25.39, -31.55], [-23.44, -31.66], [-23.96, -29.04], [-25.85, -27.55], [-25.73, -26.25], [-24.36, -25.57], [-25.18, -24.41], [-23.05, -22.86], [-20.95, -24.05], [-21.65, -21.12], [-19.53, -19.98]],
    width: 1.5,
    color: '#49a9d0',
    label: [-25.55, -26.16],
    showLabel: false,
    selectable: false,
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
}

export const ROADS: readonly MapRoad[] = [
  {
    id: '72012936',
    nama: 'Jalan Kereteg–Petir',
    points: [[36.77, 8.87], [33.01, 10.22], [29.99, 10.38], [23.74, 9.15], [19.77, 9.68], [17.59, 8.34]],
    width: 1.15,
  },
  {
    id: '72012955',
    nama: 'Jalan Kereteg–Petir',
    points: [[16.83, 8.16], [14.63, 10.3], [8.8, 9.51], [6.68, 10.68], [6.55, 18.13], [2.89, 22.63], [-3.62, 23.94], [-11.49, 27.97], [-20.58, 27.41], [-26.64, 29.06], [-32.07, 32.34]],
    width: 1.15,
  },
  {
    id: '178896184',
    nama: 'Jembatan Cibinong',
    points: [[17.59, 8.34], [16.83, 8.16]],
    width: 1.15,
  },
  {
    id: '256136956',
    nama: 'Jalan Kereteg–Petir',
    points: [[-42.0, 35.83], [-38.73, 35.13], [-35.56, 35.7], [-32.07, 32.34]],
    width: 1.15,
  },
  {
    id: '674966725',
    nama: 'Jalan Kereteg–Petir',
    points: [[36.77, 8.87], [38.91, 8.76], [42.0, 12.87]],
    width: 1.15,
  },
  {
    id: '674966726',
    nama: 'Jalan Kereteg–Petir',
    points: [[42.0, 13.23], [38.87, 9.18], [36.77, 8.87]],
    width: 1.15,
  },
  {
    id: '720133153',
    nama: 'Jalan Dramaga/Batas Kota Bogor–Ciherang',
    points: [[-18.14, -36.0], [-18.6, -24.13], [-17.72, -19.34], [-18.0, -14.08], [-19.86, -7.27], [-22.39, -2.18], [-24.92, 10.28], [-24.26, 13.27], [-25.8, 22.58], [-28.48, 27.1], [-31.8, 30.6], [-32.07, 32.34]],
    width: 1.15,
  },
];
