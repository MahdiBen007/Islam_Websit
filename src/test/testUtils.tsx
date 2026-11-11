import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders } from '@/App';
import { AppRoutes } from '@/app/router/AppRouter';

export function renderAtRoute(initialRoute = '/') {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={[initialRoute]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  );
}
