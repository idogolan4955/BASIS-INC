import { MODULES, canOpenModule } from '@basis/shared';
import { ArrowLeft } from '@phosphor-icons/react';
import { Link, useParams } from 'react-router';
import { useRequiredSession } from '../session';

// A module that is in the index but not built yet says so plainly, with the
// phase that delivers it, rather than disappearing from the navigation.

export function ModulePending() {
  const session = useRequiredSession();
  const { module: slug } = useParams();
  const definition = MODULES.find((candidate) => candidate.path === `/${slug}`);
  const allowed = definition ? canOpenModule(session.role, definition.key) : false;

  return (
    <div className="max-w-2xl px-5 py-10 lg:px-8 lg:py-14">
      {definition && allowed ? (
        <>
          <h1 className="font-display text-[2.75rem] font-medium leading-none tracking-[-0.01em]">
            {definition.name}
            <span className="code ml-3 align-top text-ink-muted">{definition.number}</span>
          </h1>
          <p className="mt-4 text-base text-ink-soft">{definition.summary}.</p>
          <p className="mt-8 border-t border-line pt-5 text-ink-muted">
            This module is not built yet. It is delivered in {definition.phase} of the implementation plan, and its
            records will open here.
          </p>
        </>
      ) : (
        <>
          <h1 className="font-display text-[2.75rem] font-medium leading-none tracking-[-0.01em]">
            {definition ? 'Not available to this role' : 'Page not found'}
          </h1>
          <p className="mt-4 text-base text-ink-soft">
            {definition
              ? `${definition.name} is outside what this role can open. An owner can change roles in Settings.`
              : 'Nothing lives at this address. Use the index to find a module.'}
          </p>
        </>
      )}
      <Link to="/" className="mt-8 inline-flex items-center gap-2 font-medium underline decoration-line-strong underline-offset-4 hover:decoration-ink">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to the Gateway
      </Link>
    </div>
  );
}
