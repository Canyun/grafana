import React from 'react';

import { Button, HorizontalGroup } from '@grafana/ui';

import { useWizardContext } from '../components/Wizard/wizardContext';

import { useCorrelationsFormContext } from './correlationsFormContext';

export const CorrelationFormNavigation = () => {
  const { currentPage, prevPage, isLastPage } = useWizardContext();
  const { readOnly, loading, correlation } = useCorrelationsFormContext();

  const LastPageNext = !readOnly && (
    <Button variant="primary" icon={loading ? 'spinner' : 'save'} type="submit" disabled={loading}>
      {correlation === undefined ? 'Add' : 'Save'}
    </Button>
  );

  const NextPage = (
    <Button variant="primary" type="submit">
      Next
    </Button>
  );

  return (
    <HorizontalGroup justify="flex-start">
      {currentPage > 0 ? (
        <Button variant="secondary" onClick={prevPage}>
          Back
        </Button>
      ) : undefined}

      {isLastPage ? LastPageNext : NextPage}
    </HorizontalGroup>
  );
};
