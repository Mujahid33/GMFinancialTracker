import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { title: 'Masuk' },
  },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true, title: 'Beranda' },
  },
  {
    path: '/pengeluaran',
    name: 'expenses',
    component: () => import('../views/ExpensesView.vue'),
    meta: { requiresAuth: true, title: 'Pengeluaran' },
  },
  {
    path: '/pemasukan',
    name: 'incomes',
    component: () => import('../views/IncomesView.vue'),
    meta: { requiresAuth: true, title: 'Pemasukan' },
  },
  {
    path: '/pinjaman',
    name: 'loans',
    component: () => import('../views/LoansView.vue'),
    meta: { requiresAuth: true, title: 'Pinjaman' },
  },
  {
    path: '/pinjaman/:id',
    name: 'loan-detail',
    component: () => import('../views/LoanDetailView.vue'),
    meta: { requiresAuth: true, title: 'Detail Pinjaman' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { path: to.query.redirect || '/' }
  }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · GM Finance` : 'GM Financial Tracker'
})

export default router