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
  },
  {
    path: '/graphs',
    name: 'Graphs',
    component: Graphs,
  },
  {
    path: '/import',
    name: 'ImportData',
    component: ImportData,
  },
  {
    path: '/analysis',
    name: 'EnergyAnalysis',
    component: EnergyAnalysis,
  },
  {
    path: '/explorer',
    name: 'DataExplorer',
    component: DataExplorer,
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
