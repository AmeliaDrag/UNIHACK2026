import FriendsChat, { useFriends } from './FriendsChat';

// Chat tab: pick an accepted friend, then talk to them (GET /friends, /messages).
export default function ChatPage({ isGuest }) {
  const f = useFriends(isGuest);
  return (
    <div className="p" style={{ height: '100%', overflowY: 'auto' }}>
      <FriendsChat isGuest={isGuest} friends={f.friends} loading={f.loading} error={f.error} reload={f.reload} />
    </div>
  );
}