import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Graphs from '../views/Graphs.vue';
import ImportData from '../views/ImportData.vue';
import EnergyAnalysis from '../views/EnergyAnalysis.vue';
import DataExplorer from '../views/DataExplorer.vue';
import Settings from '../views/Settings.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { public: true },
  },
  {
    path: '/graphs',
    name: 'Graphs',
    component: Graphs,
    meta: { public: false },
  },
  {
    path: '/import',
    name: 'ImportData',
    component: ImportData,
    meta: { public: false },
  },
  {
    path: '/analysis',
    name: 'EnergyAnalysis',
    component: EnergyAnalysis,
    meta: { public: false },
  },
  {
    path: '/explorer',
    name: 'DataExplorer',
    component: DataExplorer,
    meta: { public: false },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { public: false },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
