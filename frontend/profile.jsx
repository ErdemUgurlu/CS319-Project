export default function ProfilePage() {
    const user = {
      name: "Erdem Ugurlu",
      email: "erdem.ugurlu@ug.bilkent.edu.tr",
      role: "Teaching Assistant",
      academic: "Master's",
      type: "Part-Time",
      date: "10 Mayıs 2025",
      status: "Approved",
    };
  
    return (
      <div className="p-6 space-y-4">
        <h2 className="text-2xl font-bold">My Profile</h2>
        <div className="bg-white shadow p-6 rounded space-y-2">
          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.role}</p>
          <p><strong>Academic Level:</strong> {user.academic}</p>
          <p><strong>Employment Type:</strong> {user.type}</p>
          <p><strong>Join Date:</strong> {user.date}</p>
          <p><strong>Status:</strong> {user.status}</p>
          <button className="bg-blue-700 text-white px-4 py-2 rounded mt-4">CHANGE PASSWORD</button>
        </div>
      </div>
    );
  }
  